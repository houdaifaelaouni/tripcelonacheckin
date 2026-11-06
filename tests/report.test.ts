import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../shared/report.ts';
import { commissionFor, isLockActive, validateSeats } from '../shared/logic.ts';

const b = (o: any) => ({ id: 'B', tripId: 'T', channel: 'seller', status: 'confirmed', partnerId: 'P1', payer: { name: 'x' }, seats: [1], amount: 30, currency: 'EUR', payment: { method: 'cash', status: 'paid' }, createdBy: 's', createdAt: '2026-11-01', ...o });

test('report counts only paid confirmed bookings and tracks commission', () => {
  const r = buildReport([
    b({ sellerId: 'S1', commission: { rate: 10, amount: 3, settled: false } }),
    b({ sellerId: 'S1', seats: [2, 3], amount: 60, commission: { rate: 10, amount: 6, settled: true }, partnerId: 'P2' }),
    b({ payment: { method: 'stripe', status: 'unpaid' }, amount: 25 }),
    b({ status: 'cancelled' }),
    b({ channel: 'online', payment: { method: 'stripe', status: 'refunded' } }),
  ] as any);
  assert.equal(r.totals.revenue, 90);
  assert.equal(r.totals.seats, 3);
  assert.equal(r.totals.unpaidAmount, 25);
  assert.equal(r.totals.refunded, 30);
  assert.deepEqual(r.bySeller[0], { key: 'S1', revenue: 90, seats: 3, bookings: 2, commissionOwed: 3, commissionSettled: 6 });
  assert.equal(r.byPartner.length, 2);
});

test('seat helpers', () => {
  assert.deepEqual(validateSeats([3, 1], 55), [1, 3]);
  assert.equal(typeof validateSeats([56], 55), 'string');
  assert.equal(typeof validateSeats([2, 2], 55), 'string');
  assert.equal(typeof validateSeats([], 55), 'string');
  assert.equal(commissionFor(45, 12.5), 5.63);
  assert.ok(isLockActive({ seat: 1, bookingId: 'b', state: 'sold' }));
  assert.ok(!isLockActive({ seat: 1, bookingId: 'b', state: 'held', expiresAt: new Date(Date.now() - 1).toISOString() }));
  assert.ok(isLockActive({ seat: 1, bookingId: 'b', state: 'held', expiresAt: new Date(Date.now() + 60000).toISOString() }));
});
