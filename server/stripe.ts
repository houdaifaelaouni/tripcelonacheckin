// Two Stripe accounts, one per partner business. The public booking link
// decides which one is charged: /book/1 → STRIPE_SECRET_KEY_1, /book/2 → _2.
import Stripe from 'stripe';
import type { Booking, StripeSlot, Trip } from '../shared/types.js';
import { env } from './env.js';
import { HttpError } from './http.js';

const clients: Partial<Record<StripeSlot, Stripe>> = {};

export function isSlot(v: unknown): v is StripeSlot {
  return v === 1 || v === 2;
}

export function stripeFor(slot: StripeSlot): Stripe {
  const key = env.stripe[slot].secretKey;
  if (!key) throw new HttpError(503, `Online payments for link ${slot} are not set up yet.`);
  return (clients[slot] ??= new Stripe(key));
}

export function stripeStatus() {
  return ([1, 2] as StripeSlot[]).map((slot) => {
    const key = env.stripe[slot].secretKey;
    return {
      slot,
      configured: !!key,
      mode: key.startsWith('sk_live') || key.startsWith('rk_live') ? 'live' : key ? 'test' : 'missing',
      webhookConfigured: !!env.stripe[slot].webhookSecret,
      webhookUrl: `${env.appUrl}/api/webhooks/stripe/${slot}`,
      bookingUrl: `${env.appUrl}/book/${slot}`,
    };
  });
}

/**
 * Stripe Checkout for a booking.
 * - Online bookings: expires with the seat hold.
 * - Staff sales paid by link: the seats are already the customer's, so the link stays open 24h.
 */
export async function createCheckout(slot: StripeSlot, trip: Trip, booking: Booking) {
  const stripe = stripeFor(slot);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = booking.holdExpiresAt ? Math.floor(new Date(booking.holdExpiresAt).getTime() / 1000) : nowSec + 24 * 3600 - 60;
  const perSeat = booking.seats.length ? Math.round((booking.amount / booking.seats.length) * 100) : 0;
  const exact = perSeat * booking.seats.length === Math.round(booking.amount * 100);
  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: booking.payer.email,
    line_items: [
      {
        // Charge the booking's agreed amount (group / discounted sales included).
        quantity: exact ? booking.seats.length : 1,
        price_data: {
          currency: 'eur',
          unit_amount: exact ? perSeat : Math.round(booking.amount * 100),
          product_data: {
            name: `${trip.name} · ${trip.date}`,
            description: `Seat${booking.seats.length > 1 ? 's' : ''} ${booking.seats.join(', ')} · Departure ${trip.departureTime} from ${trip.meetingPoint}`,
          },
        },
      },
    ],
    // Stripe requires expires_at to be at least 30 minutes out; our seat hold
    // is shorter, and an expired hold is handled safely in confirmHeldBooking.
    expires_at: Math.min(Math.max(expiresAt, nowSec + 31 * 60), nowSec + 24 * 3600 - 60),
    metadata: { bookingId: booking.id, tripId: trip.id, slot: String(slot) },
    payment_intent_data: { metadata: { bookingId: booking.id, tripId: trip.id } },
    success_url: `${env.appUrl}/book/${slot}/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/book/${slot}?trip=${trip.id}&cancelled=${booking.id}`,
  });
}

export function verifyWebhook(slot: StripeSlot, rawBody: Buffer, signature: string): Stripe.Event {
  const secret = env.stripe[slot].webhookSecret;
  if (!secret) throw new HttpError(503, `Webhook secret for account ${slot} is not configured.`);
  return stripeFor(slot).webhooks.constructEvent(rawBody, signature, secret);
}
