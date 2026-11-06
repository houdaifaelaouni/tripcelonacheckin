// Boarding. Drivers can only board passengers on trips assigned to them.
import { Router } from 'express';
import type { Booking, ScanResult, Ticket, Trip } from '../../shared/types';
import { col, db, audit, nowIso } from '../firebase';
import { bad, forbidden, handle, me, notFound, requirePermission, str } from '../http';
import { verifyTicketCode } from '../security';
import { env } from '../env';
import { getTripFor } from './trips';
import { formatEUR } from '../../shared/logic';

export const checkinRouter = Router();

async function board(staffId: string, ticketId: string, trip: Trip, force: boolean): Promise<ScanResult> {
  return db.runTransaction(async (tx) => {
    const tRef = col.tickets().doc(ticketId);
    const tSnap = await tx.get(tRef);
    if (!tSnap.exists) return { outcome: 'invalid', message: 'Ticket not found.' };
    const ticket = tSnap.data() as Ticket;
    const booking = (await tx.get(col.bookings().doc(ticket.bookingId))).data() as Booking;
    const bInfo = { id: booking.id, payer: { name: booking.payer.name }, channel: booking.channel, payment: booking.payment, platform: booking.platform, externalRef: booking.externalRef };

    if (ticket.tripId !== trip.id) {
      const other = (await tx.get(col.trips().doc(ticket.tripId))).data() as Trip | undefined;
      return {
        outcome: 'wrong_trip',
        message: other ? `This ticket is for ${other.name} on ${other.date}, not this coach.` : 'This ticket is for another trip.',
        ticket,
        booking: bInfo,
        trip: other && { id: other.id, code: other.code, name: other.name, date: other.date },
      };
    }
    if (ticket.status === 'cancelled') return { outcome: 'cancelled', message: 'This ticket was cancelled. Do not board.', ticket, booking: bInfo };
    if (ticket.status === 'checked_in') {
      const at = ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : '';
      return { outcome: 'already_boarded', message: `Already boarded${at ? ` at ${at}` : ''}. Check the seat ${ticket.seat} passenger.`, ticket, booking: bInfo };
    }
    if (booking.payment.status !== 'paid' && !force) {
      const perSeat = booking.seats.length ? booking.amount / booking.seats.length : booking.amount;
      return { outcome: 'unpaid', message: `Not paid yet: ${formatEUR(perSeat)} due. Board anyway only if collected or approved.`, ticket, booking: bInfo };
    }
    const at = nowIso();
    const updated: Ticket = { ...ticket, status: 'checked_in', checkedInAt: at, checkedInBy: staffId, updatedAt: at };
    tx.set(tRef, updated);
    if (booking.payment.status !== 'paid') {
      tx.update(col.bookings().doc(booking.id), { notes: [booking.notes, `Boarded unpaid by ${staffId} at ${at}`].filter(Boolean).join(' · ') });
    }
    return { outcome: 'boarded', message: `Welcome aboard! Seat ${ticket.seat}.`, ticket: updated, booking: bInfo };
  });
}

checkinRouter.post(
  '/scan',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'checkin.scan');
    const trip = await getTripFor(staff, str(req.body.tripId, 64));
    const ticketId = verifyTicketCode(env.qrSecret, str(req.body.code, 600));
    if (!ticketId) {
      res.json({ outcome: 'invalid', message: 'Not a valid Tripcelona pass. Do not board.' } satisfies ScanResult);
      return;
    }
    const result = await board(staff.id, ticketId, trip, req.body.force === true);
    if (result.outcome === 'boarded') audit(staff.id, 'checkin', { ticketId, tripId: trip.id, via: 'scan' });
    res.json(result);
  }),
);

// Board from the manifest (passenger forgot their phone, ID check, etc.)
checkinRouter.post(
  '/tickets/:id',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'checkin.scan');
    const trip = await getTripFor(staff, str(req.body.tripId, 64));
    const result = await board(staff.id, String(req.params.id), trip, req.body.force === true);
    if (result.outcome === 'boarded') audit(staff.id, 'checkin', { ticketId: req.params.id, tripId: trip.id, via: 'manual' });
    res.json(result);
  }),
);

checkinRouter.post(
  '/tickets/:id/undo',
  handle(async (req, res) => {
    const staff = me(req);
    if (!['owner', 'coordinator', 'driver'].includes(staff.role)) throw forbidden();
    const ref = col.tickets().doc(String(req.params.id));
    const ticket = (await ref.get()).data() as Ticket | undefined;
    if (!ticket) throw notFound('Ticket not found.');
    await getTripFor(staff, ticket.tripId);
    if (ticket.status !== 'checked_in') throw bad('This passenger has not boarded.');
    await ref.update({ status: 'valid', checkedInAt: null, checkedInBy: null, updatedAt: nowIso() });
    audit(staff.id, 'checkin.undo', { ticketId: ticket.id });
    res.json({ ok: true });
  }),
);
