// Booking engine. Every seat change happens inside a Firestore transaction on
// trips/{tripId}/seats/{seat} lock documents, so two buyers can never end up
// with the same seat, whatever channel they come from.
import type { Transaction } from 'firebase-admin/firestore';
import type { Booking, SeatLock, Ticket, Trip } from '../shared/types.js';
import { HOLD_MINUTES } from '../shared/types.js';
import { isLockActive, validateSeats } from '../shared/logic.js';
import { col, db, nowIso } from './firebase.js';
import { newId, signTicketCode } from './security.js';
import { env } from './env.js';
import { bad, conflict, notFound } from './http.js';

const seatRef = (tripId: string, seat: number) => col.seats(tripId).doc(String(seat));

function makeTickets(booking: Booking, names: string[] | undefined): Ticket[] {
  const at = nowIso();
  return booking.seats.map((seat, i) => {
    const id = newId('T');
    const fallback = booking.seats.length > 1 ? `${booking.payer.name} (${i + 1}/${booking.seats.length})` : booking.payer.name;
    return {
      id,
      bookingId: booking.id,
      tripId: booking.tripId,
      seat,
      passengerName: names?.[i]?.trim() || fallback,
      status: 'valid',
      code: signTicketCode(env.qrSecret, id),
      createdAt: at,
    };
  });
}

async function readTrip(tx: Transaction, tripId: string): Promise<Trip> {
  const snap = await tx.get(col.trips().doc(tripId));
  if (!snap.exists) throw notFound('Trip not found.');
  return snap.data() as Trip;
}

export async function takenSeats(tripId: string): Promise<number[]> {
  const snap = await col.seats(tripId).get();
  const now = Date.now();
  return snap.docs
    .map((d) => d.data() as SeatLock)
    .filter((l) => isLockActive(l, now))
    .map((l) => l.seat)
    .sort((a, b) => a - b);
}

export interface CreateBookingInput {
  tripId: string;
  seats: unknown;
  passengerNames?: string[];
  /** 'hold' reserves seats for HOLD_MINUTES awaiting online payment; 'confirm' issues tickets now. */
  mode: 'hold' | 'confirm';
  data: Omit<Booking, 'id' | 'tripId' | 'seats' | 'status' | 'createdAt' | 'holdExpiresAt'>;
}

export async function createBooking(input: CreateBookingInput): Promise<{ booking: Booking; tickets: Ticket[] }> {
  return db.runTransaction(async (tx) => {
    const trip = await readTrip(tx, input.tripId);
    if (trip.status === 'cancelled' || trip.status === 'completed' || trip.status === 'departed') {
      throw bad('This trip is no longer open for bookings.');
    }
    const seats = validateSeats(input.seats, trip.capacity);
    if (typeof seats === 'string') throw bad(seats);

    const locks = await Promise.all(seats.map((s) => tx.get(seatRef(trip.id, s))));
    const busy = locks.filter((l) => isLockActive(l.data() as SeatLock | undefined)).map((l) => Number(l.id));
    if (busy.length) {
      throw conflict(
        busy.length === 1 ? `Seat ${busy[0]} was just taken. Please pick another.` : `Seats ${busy.join(', ')} were just taken.`,
      );
    }

    const at = nowIso();
    const booking: Booking = {
      ...input.data,
      id: newId('B'),
      tripId: trip.id,
      seats,
      status: input.mode === 'hold' ? 'held' : 'confirmed',
      createdAt: at,
      ...(input.mode === 'hold' ? { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() } : {}),
    };

    for (const s of seats) {
      const lock: SeatLock =
        input.mode === 'hold'
          ? { seat: s, bookingId: booking.id, state: 'held', expiresAt: booking.holdExpiresAt }
          : { seat: s, bookingId: booking.id, state: 'sold' };
      tx.set(seatRef(trip.id, s), lock);
    }
    tx.set(col.bookings().doc(booking.id), stripUndefined(booking));

    const tickets = input.mode === 'confirm' ? makeTickets(booking, input.passengerNames) : [];
    for (const t of tickets) tx.set(col.tickets().doc(t.id), t);

    // Remember passenger names on held bookings so tickets get them on payment.
    if (input.mode === 'hold' && input.passengerNames?.length) {
      tx.update(col.bookings().doc(booking.id), { passengerNames: input.passengerNames });
    }
    return { booking, tickets };
  });
}

/**
 * Confirm a held booking after payment. Idempotent (webhooks may retry).
 * If the hold expired and a seat was resold meanwhile, the passenger is moved
 * to the nearest free seat and the change is noted on the booking.
 */
export async function confirmHeldBooking(
  bookingId: string,
  payment: Partial<Booking['payment']>,
): Promise<{ booking: Booking; tickets: Ticket[] }> {
  return db.runTransaction(async (tx) => {
    const bRef = col.bookings().doc(bookingId);
    const bSnap = await tx.get(bRef);
    if (!bSnap.exists) throw notFound('Booking not found.');
    const booking = bSnap.data() as Booking & { passengerNames?: string[] };

    if (booking.status === 'confirmed') {
      // Staff sale paid later through a Stripe payment link: tickets already exist.
      const existing = await tx.get(col.tickets().where('bookingId', '==', bookingId));
      if (booking.payment.status === 'paid') return { booking, tickets: existing.docs.map((d) => d.data() as Ticket) };
      const paid: Booking = {
        ...booking,
        payment: { ...booking.payment, ...payment, method: 'stripe', status: 'paid', paidAt: payment.paidAt || nowIso() },
        updatedAt: nowIso(),
      };
      tx.set(bRef, stripUndefined(paid));
      return { booking: paid, tickets: existing.docs.map((d) => d.data() as Ticket).filter((t) => t.status !== 'cancelled') };
    }
    if (booking.status === 'cancelled') throw conflict(`Payment received for cancelled booking ${bookingId}. Needs a manual refund.`);
    // 'held' or 'expired' (paid just after the hold lapsed): re-lock seats below.

    const trip = await readTrip(tx, booking.tripId);
    const allLocks = await tx.get(col.seats(trip.id));
    const now = Date.now();
    const blockedByOthers = new Set<number>();
    for (const d of allLocks.docs) {
      const l = d.data() as SeatLock;
      if (l.bookingId !== bookingId && isLockActive(l, now)) blockedByOthers.add(l.seat);
    }

    const finalSeats: number[] = [];
    const moved: string[] = [];
    for (const s of booking.seats) {
      if (!blockedByOthers.has(s) && !finalSeats.includes(s)) {
        finalSeats.push(s);
        continue;
      }
      const alt = nearestFreeSeat(s, trip.capacity, blockedByOthers, finalSeats);
      if (alt === null) throw conflict(`Payment received but the coach is full. Booking ${bookingId} needs manual follow-up.`);
      finalSeats.push(alt);
      moved.push(`${s}→${alt}`);
    }

    // Remove locks for seats we no longer use, then lock the final seats as sold.
    for (const d of allLocks.docs) {
      const l = d.data() as SeatLock;
      if (l.bookingId === bookingId && !finalSeats.includes(l.seat)) tx.delete(d.ref);
    }
    for (const s of finalSeats) tx.set(seatRef(trip.id, s), { seat: s, bookingId, state: 'sold' } satisfies SeatLock);

    const updated: Booking = {
      ...booking,
      seats: finalSeats,
      status: 'confirmed',
      payment: { ...booking.payment, ...payment, status: 'paid', paidAt: payment.paidAt || nowIso() },
      updatedAt: nowIso(),
      ...(moved.length ? { notes: [booking.notes, `Seat changed after payment: ${moved.join(', ')}`].filter(Boolean).join(' · ') } : {}),
    };
    const { holdExpiresAt: _h, ...rest } = updated;
    tx.set(bRef, stripUndefined(rest));
    const tickets = makeTickets(updated, booking.passengerNames);
    for (const t of tickets) tx.set(col.tickets().doc(t.id), t);
    return { booking: updated, tickets };
  });
}

function nearestFreeSeat(target: number, capacity: number, blocked: Set<number>, used: number[]): number | null {
  for (let d = 1; d < capacity; d++) {
    for (const c of [target + d, target - d]) {
      if (c >= 1 && c <= capacity && !blocked.has(c) && !used.includes(c)) return c;
    }
  }
  return null;
}

/** Cancel (staff) or expire (abandoned checkout) a booking and free its seats. */
export async function releaseBooking(bookingId: string, status: 'cancelled' | 'expired', actor?: string): Promise<Booking> {
  return db.runTransaction(async (tx) => {
    const bRef = col.bookings().doc(bookingId);
    const bSnap = await tx.get(bRef);
    if (!bSnap.exists) throw notFound('Booking not found.');
    const booking = bSnap.data() as Booking;
    if (status === 'expired' && booking.status !== 'held') return booking; // already paid or handled
    if (booking.status === 'cancelled') return booking;

    const lockSnaps = await Promise.all(booking.seats.map((s) => tx.get(seatRef(booking.tripId, s))));
    const ticketSnaps = await tx.get(col.tickets().where('bookingId', '==', bookingId));

    for (const l of lockSnaps) {
      if (l.exists && (l.data() as SeatLock).bookingId === bookingId) tx.delete(l.ref);
    }
    const at = nowIso();
    for (const t of ticketSnaps.docs) tx.update(t.ref, { status: 'cancelled', updatedAt: at });
    const updated = { ...booking, status, updatedAt: at, ...(actor ? { cancelledBy: actor } : {}) };
    tx.set(bRef, stripUndefined(updated));
    return updated;
  });
}

/** Move one passenger to another seat on the same trip. */
export async function moveTicket(ticketId: string, newSeat: number): Promise<Ticket> {
  return db.runTransaction(async (tx) => {
    const tRef = col.tickets().doc(ticketId);
    const tSnap = await tx.get(tRef);
    if (!tSnap.exists) throw notFound('Ticket not found.');
    const ticket = tSnap.data() as Ticket;
    if (ticket.status === 'cancelled') throw bad('This ticket is cancelled.');
    if (ticket.seat === newSeat) return ticket;
    const trip = await readTrip(tx, ticket.tripId);
    if (!Number.isInteger(newSeat) || newSeat < 1 || newSeat > trip.capacity) throw bad('That seat does not exist.');

    const target = await tx.get(seatRef(trip.id, newSeat));
    if (isLockActive(target.data() as SeatLock | undefined)) throw conflict(`Seat ${newSeat} is taken.`);
    const bRef = col.bookings().doc(ticket.bookingId);
    const bSnap = await tx.get(bRef);
    const booking = bSnap.data() as Booking;

    tx.delete(seatRef(trip.id, ticket.seat));
    tx.set(seatRef(trip.id, newSeat), { seat: newSeat, bookingId: ticket.bookingId, state: 'sold' } satisfies SeatLock);
    const updated = { ...ticket, seat: newSeat, updatedAt: nowIso() };
    tx.set(tRef, updated);
    tx.update(bRef, { seats: booking.seats.map((s) => (s === ticket.seat ? newSeat : s)).sort((a, b) => a - b), updatedAt: nowIso() });
    return updated;
  });
}

/** Firestore rejects `undefined` values; drop them before writing. */
export function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

