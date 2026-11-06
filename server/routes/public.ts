// Endpoints customers use without an account: browse trips on a booking link,
// pay, see their passes. Nothing here trusts prices or seats from the browser.
import express, { Router } from 'express';
import type { Booking, Partner, PublicPass, PublicTrip, StripeSlot, Ticket, Trip } from '../../shared/types';
import { round2 } from '../../shared/logic';
import { col, audit, nowIso } from '../firebase';
import { bad, handle, notFound, str, HttpError } from '../http';
import { confirmHeldBooking, createBooking, releaseBooking, stripUndefined, takenSeats } from '../seats';
import { createCheckout, isSlot, stripeFor, verifyWebhook } from '../stripe';
import { verifyTicketCode } from '../security';
import { env } from '../env';
import { sendConfirmationEmail, whatsappLink, passUrl } from '../notify';

export const publicRouter = Router();
export const webhookRouter = Router();

const today = () => new Date().toISOString().slice(0, 10);

function parseSlot(v: unknown): StripeSlot {
  const n = Number(v);
  if (!isSlot(n)) throw notFound('This booking link does not exist.');
  return n;
}

async function partnerForSlot(slot: StripeSlot): Promise<Partner | null> {
  const snap = await col.partners().where('stripeSlot', '==', slot).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as Partner);
}

function toPublicTrip(t: Trip, seatsTaken: number[]): PublicTrip {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    destination: t.destination,
    date: t.date,
    departureTime: t.departureTime,
    meetingPoint: t.meetingPoint,
    meetingPointUrl: t.meetingPointUrl,
    price: t.price,
    currency: t.currency,
    capacity: t.capacity,
    seatsTaken,
  };
}

const isBookable = (t: Trip) => t.onlineSales && t.status === 'scheduled' && t.date >= today();

// Trips on sale through a booking link.
publicRouter.get(
  '/booking/:slot',
  handle(async (req, res) => {
    const slot = parseSlot(req.params.slot);
    const partner = await partnerForSlot(slot);
    const snap = await col.trips().where('date', '>=', today()).get();
    const trips = snap.docs.map((d) => d.data() as Trip).filter(isBookable);
    trips.sort((a, b) => (a.date + a.departureTime).localeCompare(b.date + b.departureTime));
    const withSeats = await Promise.all(trips.map(async (t) => toPublicTrip(t, await takenSeats(t.id))));
    res.json({ slot, partnerName: partner?.name ?? 'Tripcelona', trips: withSeats });
  }),
);

publicRouter.get(
  '/trips/:id',
  handle(async (req, res) => {
    const snap = await col.trips().doc(String(req.params.id)).get();
    const trip = snap.data() as Trip | undefined;
    if (!trip || !isBookable(trip)) throw notFound('This trip is not available for online booking.');
    res.json(toPublicTrip(trip, await takenSeats(trip.id)));
  }),
);

publicRouter.post(
  '/checkout',
  handle(async (req, res) => {
    const slot = parseSlot(req.body.slot);
    const partner = await partnerForSlot(slot);
    if (!partner) throw new HttpError(503, 'Online booking is not set up for this link yet.');
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 200).toLowerCase();
    const phone = str(req.body.phone, 40);
    if (name.length < 2) throw bad('Please enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Please enter a valid email address.');

    const tripSnap = await col.trips().doc(str(req.body.tripId, 64)).get();
    const trip = tripSnap.data() as Trip | undefined;
    if (!trip || !isBookable(trip)) throw notFound('This trip is not available for online booking.');
    const seatCount = Array.isArray(req.body.seats) ? req.body.seats.length : 0;
    if (seatCount > 10) throw bad('For more than 10 seats, please contact us for a group booking.');

    const passengerNames = Array.isArray(req.body.passengerNames)
      ? (req.body.passengerNames as unknown[]).map((n) => str(n, 120))
      : undefined;

    const { booking } = await createBooking({
      tripId: trip.id,
      seats: req.body.seats,
      passengerNames,
      mode: 'hold',
      data: {
        channel: 'online',
        partnerId: partner.id,
        payer: { name, email, ...(phone ? { phone } : {}) },
        amount: round2(trip.price * seatCount),
        currency: 'EUR',
        payment: { method: 'stripe', status: 'pending', stripeSlot: slot },
        createdBy: 'public',
      },
    });

    try {
      const session = await createCheckout(slot, trip, booking);
      await col.bookings().doc(booking.id).update({ 'payment.stripeSessionId': session.id });
      res.json({ url: session.url, bookingId: booking.id });
    } catch (err) {
      await releaseBooking(booking.id, 'expired');
      throw err;
    }
  }),
);

/** Shared by the success page and the webhook: confirm, then notify once. */
async function finalizePaidBooking(bookingId: string, payment: Partial<Booking['payment']>) {
  const before = (await col.bookings().doc(bookingId).get()).data() as Booking | undefined;
  const { booking, tickets } = await confirmHeldBooking(bookingId, payment);
  if (before?.status !== 'confirmed') {
    const trip = (await col.trips().doc(booking.tripId).get()).data() as Trip;
    const emailStatus = await sendConfirmationEmail(trip, booking, tickets);
    await col.bookings().doc(bookingId).update({ emailStatus, updatedAt: nowIso() });
    audit('public', 'booking.paid', { bookingId, amount: booking.amount, slot: booking.payment.stripeSlot });
  }
  return { booking, tickets };
}

// Success page: the session id proves ownership of the booking.
publicRouter.get(
  '/bookings/:id',
  handle(async (req, res) => {
    const sessionId = str(req.query.session_id, 300);
    const snap = await col.bookings().doc(String(req.params.id)).get();
    let booking = snap.data() as Booking | undefined;
    if (!booking || !sessionId || booking.payment.stripeSessionId !== sessionId) throw notFound('Booking not found.');

    let tickets: Ticket[] = [];
    if (booking.status !== 'cancelled' && booking.payment.status !== 'paid' && booking.payment.stripeSlot) {
      // The webhook may not have arrived yet: ask Stripe directly.
      const session = await stripeFor(booking.payment.stripeSlot).checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        ({ booking, tickets } = await finalizePaidBooking(booking.id, {
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        }));
      }
    }
    if (booking.status === 'confirmed' && !tickets.length) {
      const t = await col.tickets().where('bookingId', '==', booking.id).get();
      tickets = t.docs.map((d) => d.data() as Ticket).sort((a, b) => a.seat - b.seat);
    }

    const trip = (await col.trips().doc(booking.tripId).get()).data() as Trip;
    res.json({
      booking: { id: booking.id, status: booking.status, seats: booking.seats, amount: booking.amount, payer: booking.payer, notes: booking.notes },
      trip: toPublicTrip(trip, []),
      tickets: tickets.map((t) => ({ id: t.id, seat: t.seat, passengerName: t.passengerName, code: t.code, url: passUrl(t) })),
      whatsappUrl: booking.status === 'confirmed' ? whatsappLink(undefined, trip, tickets) : null,
    });
  }),
);

// Customer pressed "back" on Stripe: free the seats right away.
publicRouter.post(
  '/bookings/:id/release',
  handle(async (req, res) => {
    const snap = await col.bookings().doc(String(req.params.id)).get();
    const booking = snap.data() as Booking | undefined;
    if (booking?.status === 'held' && booking.channel === 'online') {
      // Close the Stripe page too, so the customer can't pay for seats we just freed.
      if (booking.payment.stripeSlot && booking.payment.stripeSessionId) {
        await stripeFor(booking.payment.stripeSlot)
          .checkout.sessions.expire(booking.payment.stripeSessionId)
          .catch(() => undefined); // already paid or expired: the webhook decides
      }
      const fresh = (await col.bookings().doc(booking.id).get()).data() as Booking;
      if (fresh.status === 'held') await releaseBooking(booking.id, 'expired');
    }
    res.json({ ok: true });
  }),
);

publicRouter.get(
  '/pass/:code',
  handle(async (req, res) => {
    const ticketId = verifyTicketCode(env.qrSecret, String(req.params.code));
    if (!ticketId) throw notFound('This pass is not valid.');
    const ticket = (await col.tickets().doc(ticketId).get()).data() as Ticket | undefined;
    if (!ticket) throw notFound('This pass is not valid.');
    const trip = (await col.trips().doc(ticket.tripId).get()).data() as Trip;
    const booking = (await col.bookings().doc(ticket.bookingId).get()).data() as Booking;
    const { seatsTaken: _s, capacity: _c, price: _p, ...tripInfo } = toPublicTrip(trip, []);
    const pass: PublicPass = {
      ticket: { id: ticket.id, seat: ticket.seat, passengerName: ticket.passengerName, status: ticket.status, code: ticket.code, checkedInAt: ticket.checkedInAt },
      trip: tripInfo,
      bookingId: booking.id,
      paid: booking.payment.status === 'paid',
    };
    res.json(pass);
  }),
);

// ---------------------------------------------------------------------------
// Stripe webhooks: one endpoint per account. Needs the raw body.
// ---------------------------------------------------------------------------

webhookRouter.post(
  '/stripe/:slot',
  express.raw({ type: 'application/json' }),
  handle(async (req, res) => {
    const slot = parseSlot(req.params.slot);
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') throw bad('Missing Stripe signature.');
    let event;
    try {
      event = verifyWebhook(slot, req.body as Buffer, signature);
    } catch (err) {
      console.warn('[stripe] bad webhook signature', err);
      throw bad('Invalid signature.');
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (bookingId && session.payment_status === 'paid') {
        await finalizePaidBooking(bookingId, {
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        });
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const bookingId = event.data.object.metadata?.bookingId;
      if (bookingId) await releaseBooking(bookingId, 'expired');
    } else if (event.type === 'charge.refunded') {
      const intentId = typeof event.data.object.payment_intent === 'string' ? event.data.object.payment_intent : undefined;
      if (intentId && event.data.object.refunded) {
        const snap = await col.bookings().where('payment.paymentIntentId', '==', intentId).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update(stripUndefined({ 'payment.status': 'refunded', updatedAt: nowIso() }));
          audit('stripe', 'booking.refunded', { bookingId: snap.docs[0].id });
        }
      }
    }
    res.json({ received: true });
  }),
);
