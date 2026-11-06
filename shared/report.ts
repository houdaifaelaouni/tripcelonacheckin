// Pure aggregation for the reports screen (unit-tested).
import type { Booking, Channel, PaymentMethod } from './types.js';
import { countsAsRevenue, round2 } from './logic.js';

export interface Bucket {
  key: string;
  revenue: number;
  seats: number;
  bookings: number;
}

export interface SellerLine extends Bucket {
  commissionOwed: number;
  commissionSettled: number;
}

export interface Report {
  totals: { revenue: number; seats: number; bookings: number; unpaidAmount: number; unpaidBookings: number; refunded: number };
  byPartner: Bucket[];
  byChannel: Bucket[];
  byMethod: Bucket[];
  bySeller: SellerLine[];
}

function add(map: Map<string, Bucket>, key: string, b: Booking) {
  const cur = map.get(key) ?? { key, revenue: 0, seats: 0, bookings: 0 };
  cur.revenue = round2(cur.revenue + b.amount);
  cur.seats += b.seats.length;
  cur.bookings += 1;
  map.set(key, cur);
}

const sorted = <T extends Bucket>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.revenue - a.revenue);

export function buildReport(bookings: Booking[]): Report {
  const byPartner = new Map<string, Bucket>();
  const byChannel = new Map<Channel | string, Bucket>();
  const byMethod = new Map<PaymentMethod | string, Bucket>();
  const bySeller = new Map<string, SellerLine>();
  const totals = { revenue: 0, seats: 0, bookings: 0, unpaidAmount: 0, unpaidBookings: 0, refunded: 0 };

  for (const b of bookings) {
    if (b.status === 'confirmed' && b.payment.status === 'unpaid') {
      totals.unpaidAmount = round2(totals.unpaidAmount + b.amount);
      totals.unpaidBookings += 1;
    }
    if (b.payment.status === 'refunded') totals.refunded = round2(totals.refunded + b.amount);
    if (!countsAsRevenue(b)) continue;

    totals.revenue = round2(totals.revenue + b.amount);
    totals.seats += b.seats.length;
    totals.bookings += 1;
    add(byPartner, b.partnerId, b);
    add(byChannel, b.channel, b);
    add(byMethod, b.payment.method, b);

    if (b.sellerId) {
      const cur = bySeller.get(b.sellerId) ?? { key: b.sellerId, revenue: 0, seats: 0, bookings: 0, commissionOwed: 0, commissionSettled: 0 };
      cur.revenue = round2(cur.revenue + b.amount);
      cur.seats += b.seats.length;
      cur.bookings += 1;
      if (b.commission) {
        if (b.commission.settled) cur.commissionSettled = round2(cur.commissionSettled + b.commission.amount);
        else cur.commissionOwed = round2(cur.commissionOwed + b.commission.amount);
      }
      bySeller.set(b.sellerId, cur);
    }
  }

  return { totals, byPartner: sorted(byPartner), byChannel: sorted(byChannel), byMethod: sorted(byMethod), bySeller: sorted(bySeller) };
}
