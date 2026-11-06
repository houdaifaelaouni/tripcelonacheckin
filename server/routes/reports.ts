import { Router } from 'express';
import type { Booking } from '../../shared/types.js';
import { can } from '../../shared/permissions.js';
import { buildReport } from '../../shared/report.js';
import { countsAsRevenue } from '../../shared/logic.js';
import { col, db, audit, nowIso } from '../firebase.js';
import { bad, forbidden, handle, me, requirePermission, str } from '../http.js';

export const reportsRouter = Router();

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

reportsRouter.get(
  '/',
  handle(async (req, res) => {
    const staff = me(req);
    const all = can(staff.role, 'reports.all') || staff.role === 'coordinator';
    const ownPartner = can(staff.role, 'reports.ownPartner');
    const ownSales = can(staff.role, 'commissions.viewOwn');
    if (!all && !ownPartner && !ownSales) throw forbidden();

    const from = str(req.query.from, 10);
    const to = str(req.query.to, 10);
    if ((from && !isDate(from)) || (to && !isDate(to))) throw bad('Use dates like 2026-11-01.');
    const start = from || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

    let query: FirebaseFirestore.Query = col.bookings();
    if (!all && ownPartner) query = query.where('partnerId', '==', staff.partnerId || '-');
    else if (!all) query = query.where('sellerId', '==', staff.id);
    else query = query.where('createdAt', '>=', start);

    const bookings = (await query.get()).docs
      .map((d) => d.data() as Booking)
      .filter((b) => b.createdAt.slice(0, 10) >= start && (!to || b.createdAt.slice(0, 10) <= to));

    const report = buildReport(bookings);
    // Commission figures are only for owner, coordinator, or the seller themself.
    if (staff.role === 'partner') report.bySeller = [];
    res.json({ from: start, to: to || null, ...report });
  }),
);

// Owner marks a seller's outstanding commission as paid out.
reportsRouter.post(
  '/commissions/settle',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'commissions.settle');
    const sellerId = str(req.body.sellerId, 32);
    if (!sellerId) throw bad('Choose a seller.');
    const snap = await col.bookings().where('sellerId', '==', sellerId).get();
    const due = snap.docs.filter((d) => {
      const b = d.data() as Booking;
      return b.commission && !b.commission.settled && countsAsRevenue(b);
    });
    const at = nowIso();
    let total = 0;
    for (let i = 0; i < due.length; i += 400) {
      const batch = db.batch();
      for (const d of due.slice(i, i + 400)) {
        const b = d.data() as Booking;
        total += b.commission!.amount;
        batch.update(d.ref, { 'commission.settled': true, 'commission.settledAt': at });
      }
      await batch.commit();
    }
    audit(owner.id, 'commission.settle', { sellerId, bookings: due.length, total });
    res.json({ settledBookings: due.length, total: Math.round(total * 100) / 100 });
  }),
);
