import type { Booking, SeatLock } from './types.js';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function commissionFor(amount: number, ratePercent: number | undefined): number {
  if (!ratePercent || ratePercent <= 0) return 0;
  return round2((amount * ratePercent) / 100);
}

/** A seat lock blocks the seat if it's sold, or held and not yet expired. */
export function isLockActive(lock: SeatLock | undefined, now = Date.now()): boolean {
  if (!lock) return false;
  if (lock.state === 'sold') return true;
  return !!lock.expiresAt && new Date(lock.expiresAt).getTime() > now;
}

/** Bookings that count towards revenue: confirmed and actually paid. */
export function countsAsRevenue(b: Pick<Booking, 'status' | 'payment'>): boolean {
  return b.status === 'confirmed' && b.payment.status === 'paid';
}

export function validateSeats(seats: unknown, capacity: number): number[] | string {
  if (!Array.isArray(seats) || seats.length === 0) return 'Pick at least one seat.';
  const out: number[] = [];
  for (const s of seats) {
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > capacity) return `Seat ${s} does not exist on this coach.`;
    if (out.includes(n)) return `Seat ${n} is listed twice.`;
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

export function formatEUR(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
}
