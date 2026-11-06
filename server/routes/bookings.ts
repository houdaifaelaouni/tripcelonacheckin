import { Router } from 'express';
import type { Booking, Channel, Partner, PaymentMethod, Staff, Ticket, Trip } from '../../shared/types';
import { PLATFORMS } from '../../shared/types';
import { can } from '../../shared/permissions';
import { commissionFor, round2 } from '../../shared/logic';
import { col, audit, nowIso } from '../firebase';
import { bad, forbidden, handle, me, notFound, requirePermission, str } from '../http';
import { createBooking, moveTicket, releaseBooking, stripUndefined } from '../seats';
import { passUrl, sendConfirmationEmail, whatsappLink } from '../notify';
import { createCheckout } from '../stripe';

export const bookingsRouter = Router();
export const ticketsRouter = Router();

const STAFF_CHANNELS: Channel[] = ['seller', 'platform', 'group'];
// 'stripe' = the customer pays through a Stripe payment link sent by the seller.
const STAFF_METHODS: PaymentMethod[] = ['stripe', 'cash', 'card_terminal', 'platform', 'invoice', 'free'];

export function canSeeBooking(staff: Staff, b: Booking): boolean {
  if (can(staff.role, 'bookings.viewAll')) return true;
  if (can(staff.role, 'bookings.viewOwnPartner') && b.partnerId === staff.partnerId) return true;
  if (can(staff.role, 'bookings.viewOwnSales') && b.sellerId === staff.id) return true;
  return false;
}

async function loadBooking(staff: Staff, id: string): Promise<Booking> {
  const b = (await col.bookings().doc(id).get()).data() as Booking | undefined;
  if (!b || !canSeeBooking(staff, b)) throw notFound('Booking not found.');
  return b;
}

async function bookingDetail(b: Booking) {
  const [trip, ticketsSnap] = await Promise.all([
    col.trips().doc(b.tripId).get().then((s) => s.data() as Trip),
    col.tickets().where('bookingId', '==', b.id).get(),
  ]);
  const tickets = ticketsSnap.docs.map((d) => d.data() as Ticket).sort((a, x) => a.seat - x.seat);
  const live = tickets.filter((t) => t.status !== 'cancelled');
  return {
    booking: b,
    trip,
    tickets: tickets.map((t) => ({ ...t, url: passUrl(t) })),
    whatsappUrl: live.length ? whatsappLink(b.payer.phone, trip, live) : null,
  };
}

async function resolvePartnerId(staff: Staff, requested: string): Promise<string> {
  const isManager = staff.role === 'owner' || staff.role === 'coordinator';
  const id = isManager && requested ? requested : staff.partnerId || requested;
  if (id) {
    const p = await col.partners().doc(id).get();
    if (!p.exists) throw bad('Unknown partner.');
    return id;
  }
  const first = await col.partners().orderBy('stripeSlot').limit(1).get();
  if (first.empty) throw bad('Add a partner business first (Owner → Partners).');
  return (first.docs[0].data() as Partner).id;
}

bookingsRouter.post(
  '/',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'bookings.create');
    const body = req.body as Record<string, any>;
    const channel = body.channel as Channel;
    if (!STAFF_CHANNELS.includes(channel)) throw bad('Choose a sale type.');

    const trip = (await col.trips().doc(str(body.tripId, 64)).get()).data() as Trip | undefined;
    if (!trip) throw notFound('Trip not found.');

    const payerName = str(body.payer?.name, 120);
    if (payerName.length < 2) throw bad('Enter the customer name.');
    const payer = stripUndefined({
      name: payerName,
      email: str(body.payer?.email, 200).toLowerCase() || undefined,
      phone: str(body.payer?.phone, 40) || undefined,
    });

    const seatCount = Array.isArray(body.seats) ? body.seats.length : 0;
    let method = body.paymentMethod as PaymentMethod;
    if (channel === 'platform') method = 'platform';
    if (!STAFF_METHODS.includes(method)) throw bad('Choose how it was paid.');
    if (method === 'free' && staff.role === 'seller') throw forbidden('Only the owner or a coordinator can issue free seats.');

    const isManager = staff.role === 'owner' || staff.role === 'coordinator';
    const listPrice = round2(trip.price * seatCount);
    let amount = listPrice;
    if (method === 'free') amount = 0;
    else if (body.amount !== undefined && body.amount !== '' && (isManager || channel !== 'seller')) {
      amount = round2(Number(body.amount));
      if (!(amount >= 0)) throw bad('Enter a valid amount.');
    }

    const paidNow = method === 'free' || method === 'platform' || (method !== 'stripe' && body.paymentStatus === 'paid');
    const platform = channel === 'platform' ? str(body.platform, 40) : undefined;
    if (channel === 'platform' && !PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) throw bad('Choose the platform.');
    const externalRef = str(body.externalRef, 80) || undefined;
    if (channel === 'platform' && !externalRef) throw bad('Enter the platform booking reference.');

    const sellerId = staff.role === 'seller' ? staff.id : str(body.sellerId, 32) || undefined;
    let commission: Booking['commission'];
    if (sellerId) {
      const seller = (await col.staff().doc(sellerId).get()).data() as Staff | undefined;
      if (!seller || seller.role !== 'seller') throw bad('Unknown seller.');
      const rate = seller.commissionRate ?? 0;
      if (rate > 0) commission = { rate, amount: commissionFor(amount, rate), settled: false };
    }

    const { booking, tickets } = await createBooking({
      tripId: trip.id,
      seats: body.seats,
      passengerNames: Array.isArray(body.passengerNames) ? body.passengerNames.map((n: unknown) => str(n, 120)) : undefined,
      mode: 'confirm',
      data: stripUndefined({
        channel,
        partnerId: await resolvePartnerId(staff, str(body.partnerId, 32)),
        payer,
        amount,
        currency: 'EUR' as const,
        payment: { method, status: paidNow ? 'paid' : 'unpaid', ...(paidNow ? { paidAt: nowIso() } : {}) },
        platform,
        externalRef,
        sellerId,
        commission,
        notes: str(body.notes, 500) || undefined,
        createdBy: staff.id,
      }),
    });

    let paymentUrl: string | undefined;
    if (method === 'stripe' && amount > 0) paymentUrl = await createPaymentLink(booking, trip);

    let emailStatus: string = 'skipped';
    if (body.sendEmail !== false && payer.email) {
      emailStatus = await sendConfirmationEmail(trip, booking, tickets);
      await col.bookings().doc(booking.id).update({ emailStatus });
    }
    audit(staff.id, 'booking.create', { bookingId: booking.id, channel, amount, seats: booking.seats });
    res.status(201).json({ ...(await bookingDetail(booking)), emailStatus, paymentUrl });
  }),
);

bookingsRouter.get(
  '/',
  handle(async (req, res) => {
    const staff = me(req);
    if (!['bookings.viewAll', 'bookings.viewOwnPartner', 'bookings.viewOwnSales'].some((p) => can(staff.role, p as never))) throw forbidden();
    let query: FirebaseFirestore.Query = col.bookings();
    const tripId = str(req.query.tripId, 64);
    if (tripId) query = query.where('tripId', '==', tripId);
    else if (!can(staff.role, 'bookings.viewAll') && can(staff.role, 'bookings.viewOwnSales')) query = query.where('sellerId', '==', staff.id);
    else if (!can(staff.role, 'bookings.viewAll')) query = query.where('partnerId', '==', staff.partnerId || '-');
    else {
      const from = str(req.query.from, 10) || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      query = query.where('createdAt', '>=', from);
    }
    const rows = (await query.get()).docs
      .map((d) => d.data() as Booking)
      .filter((b) => canSeeBooking(staff, b))
      .filter((b) => (req.query.status ? b.status === req.query.status : b.status !== 'expired'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 300);
    res.json(rows);
  }),
);

bookingsRouter.get(
  '/:id',
  handle(async (req, res) => {
    res.json(await bookingDetail(await loadBooking(me(req), String(req.params.id))));
  }),
);

/** Stripe Checkout link for a staff sale, charged to the booking partner's Stripe account. */
async function createPaymentLink(booking: Booking, trip: Trip): Promise<string> {
  const partner = (await col.partners().doc(booking.partnerId).get()).data() as Partner | undefined;
  if (!partner) throw bad('This booking has no partner, so there is no Stripe account to charge.');
  const session = await createCheckout(partner.stripeSlot, trip, booking);
  await col.bookings().doc(booking.id).update({
    'payment.method': 'stripe',
    'payment.stripeSlot': partner.stripeSlot,
    'payment.stripeSessionId': session.id,
    paymentUrl: session.url,
    updatedAt: nowIso(),
  });
  return session.url!;
}

/** Sellers may manage their own sales; managers may manage anything. */
function canManage(staff: Staff, b: Booking) {
  return can(staff.role, 'manifest.edit') || (staff.role === 'seller' && b.sellerId === staff.id);
}

bookingsRouter.post(
  '/:id/cancel',
  handle(async (req, res) => {
    const staff = me(req);
    const b = await loadBooking(staff, String(req.params.id));
    if (!canManage(staff, b)) throw forbidden();
    const boarded = await col.tickets().where('bookingId', '==', b.id).where('status', '==', 'checked_in').limit(1).get();
    if (!boarded.empty && staff.role === 'seller') throw forbidden('A passenger already boarded. Ask a coordinator.');
    const updated = await releaseBooking(b.id, 'cancelled', staff.id);
    audit(staff.id, 'booking.cancel', { bookingId: b.id, reason: str(req.body.reason, 200) });
    res.json(await bookingDetail(updated));
  }),
);

bookingsRouter.post(
  '/:id/mark-paid',
  handle(async (req, res) => {
    const staff = me(req);
    const b = await loadBooking(staff, String(req.params.id));
    if (!canManage(staff, b)) throw forbidden();
    const method = (req.body.method as PaymentMethod) || b.payment.method;
    if (!STAFF_METHODS.includes(method) || method === 'free' || method === 'stripe') throw bad('Choose how it was paid.');
    const payment = { ...b.payment, method, status: 'paid' as const, paidAt: nowIso() };
    await col.bookings().doc(b.id).update({ payment, updatedAt: nowIso() });
    audit(staff.id, 'booking.markPaid', { bookingId: b.id, method });
    res.json(await bookingDetail({ ...b, payment }));
  }),
);

// (Re)create a Stripe payment link for an unpaid staff sale.
bookingsRouter.post(
  '/:id/payment-link',
  handle(async (req, res) => {
    const staff = me(req);
    const b = await loadBooking(staff, String(req.params.id));
    if (!canManage(staff, b)) throw forbidden();
    if (b.status !== 'confirmed') throw bad('Only active bookings can be paid.');
    if (b.payment.status === 'paid') throw bad('This booking is already paid.');
    if (!(b.amount > 0)) throw bad('Nothing to pay on this booking.');
    const trip = (await col.trips().doc(b.tripId).get()).data() as Trip;
    const url = await createPaymentLink(b, trip);
    audit(staff.id, 'booking.paymentLink', { bookingId: b.id });
    res.json({ paymentUrl: url });
  }),
);

bookingsRouter.post(
  '/:id/email',
  handle(async (req, res) => {
    const staff = me(req);
    const b = await loadBooking(staff, String(req.params.id));
    if (!canManage(staff, b)) throw forbidden();
    const detail = await bookingDetail(b);
    const status = await sendConfirmationEmail(detail.trip, b, detail.tickets.filter((t) => t.status !== 'cancelled'));
    res.json({ emailStatus: status });
  }),
);

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

ticketsRouter.post(
  '/:id/move',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'manifest.edit');
    const ticket = await moveTicket(String(req.params.id), Number(req.body.seat));
    audit(staff.id, 'ticket.move', { ticketId: ticket.id, seat: ticket.seat });
    res.json(ticket);
  }),
);

ticketsRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'manifest.edit');
    const ref = col.tickets().doc(String(req.params.id));
    const t = (await ref.get()).data() as Ticket | undefined;
    if (!t) throw notFound('Ticket not found.');
    const passengerName = str(req.body.passengerName, 120);
    if (passengerName.length < 2) throw bad('Enter the passenger name.');
    await ref.update({ passengerName, updatedAt: nowIso() });
    audit(staff.id, 'ticket.rename', { ticketId: t.id });
    res.json({ ...t, passengerName });
  }),
);
