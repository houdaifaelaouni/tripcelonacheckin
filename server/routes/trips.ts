import { Router } from 'express';
import type { Booking, ManifestRow, Staff, Ticket, Trip, TripStatus, TripSummary } from '../../shared/types';
import { DEFAULT_CAPACITY, MAX_CAPACITY } from '../../shared/types';
import { can } from '../../shared/permissions';
import { countsAsRevenue, round2 } from '../../shared/logic';
import { col, audit, nowIso } from '../firebase';
import { bad, conflict, forbidden, handle, me, notFound, requirePermission, str } from '../http';
import { newId } from '../security';
import { stripUndefined, takenSeats } from '../seats';

export const tripsRouter = Router();

const STATUSES: TripStatus[] = ['scheduled', 'boarding', 'departed', 'completed', 'cancelled'];
const today = () => new Date().toISOString().slice(0, 10);

export function canSeeTrip(staff: Staff, trip: Trip): boolean {
  if (staff.role === 'driver') return trip.driverIds?.includes(staff.id) ?? false;
  return can(staff.role, 'trips.view');
}

export async function getTripFor(staff: Staff, id: string): Promise<Trip> {
  const trip = (await col.trips().doc(id).get()).data() as Trip | undefined;
  if (!trip) throw notFound('Trip not found.');
  if (!canSeeTrip(staff, trip)) throw forbidden('This trip is not assigned to you.');
  return trip;
}

/** Revenue a staff member is allowed to see. */
function visibleRevenue(staff: Staff, bookings: Booking[]): number {
  if (can(staff.role, 'reports.all') || staff.role === 'coordinator') {
    return round2(bookings.filter(countsAsRevenue).reduce((s, b) => s + b.amount, 0));
  }
  if (staff.role === 'partner') {
    return round2(bookings.filter((b) => countsAsRevenue(b) && b.partnerId === staff.partnerId).reduce((s, b) => s + b.amount, 0));
  }
  return 0;
}

async function summarize(staff: Staff, trip: Trip): Promise<TripSummary> {
  const [bookingsSnap, ticketsSnap] = await Promise.all([
    col.bookings().where('tripId', '==', trip.id).get(),
    col.tickets().where('tripId', '==', trip.id).get(),
  ]);
  const bookings = bookingsSnap.docs.map((d) => d.data() as Booking);
  const tickets = ticketsSnap.docs.map((d) => d.data() as Ticket);
  const now = Date.now();
  return {
    ...trip,
    sold: tickets.filter((t) => t.status !== 'cancelled').length,
    held: bookings
      .filter((b) => b.status === 'held' && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() > now)
      .reduce((s, b) => s + b.seats.length, 0),
    boarded: tickets.filter((t) => t.status === 'checked_in').length,
    revenue: visibleRevenue(staff, bookings),
  };
}

tripsRouter.get(
  '/',
  handle(async (req, res) => {
    const staff = me(req);
    const scope = str(req.query.scope, 10) || 'upcoming';
    let query: FirebaseFirestore.Query = col.trips();
    if (staff.role === 'driver') query = query.where('driverIds', 'array-contains', staff.id);
    else requirePermission(req, 'trips.view');
    const all = (await query.get()).docs.map((d) => d.data() as Trip);
    const cutoff = staff.role === 'driver' ? new Date(Date.now() - 86400_000).toISOString().slice(0, 10) : today();
    const trips = all
      .filter((t) => (scope === 'past' ? t.date < cutoff : scope === 'all' ? true : t.date >= cutoff))
      .sort((a, b) => (a.date + a.departureTime).localeCompare(b.date + b.departureTime));
    if (scope === 'past') trips.reverse();
    res.json(await Promise.all(trips.slice(0, 100).map((t) => summarize(staff, t))));
  }),
);

tripsRouter.get(
  '/:id',
  handle(async (req, res) => {
    const staff = me(req);
    const trip = await getTripFor(staff, String(req.params.id));
    res.json({ ...(await summarize(staff, trip)), seatsTaken: await takenSeats(trip.id) });
  }),
);

function readTripInput(body: Record<string, unknown>, partial: boolean): Partial<Trip> {
  const out: Partial<Trip> = {};
  const has = (k: string) => body[k] !== undefined;
  const need = (k: string) => !partial || has(k);

  if (need('name')) {
    out.name = str(body.name, 120);
    if (out.name.length < 2) throw bad('Give the trip a name.');
  }
  if (need('destination')) out.destination = str(body.destination, 120) || out.name || '';
  if (need('date')) {
    out.date = str(body.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date)) throw bad('Pick a valid date.');
  }
  if (need('departureTime')) {
    out.departureTime = str(body.departureTime, 5);
    if (!/^\d{2}:\d{2}$/.test(out.departureTime)) throw bad('Pick a valid departure time.');
  }
  if (need('meetingPoint')) {
    out.meetingPoint = str(body.meetingPoint, 200);
    if (out.meetingPoint.length < 2) throw bad('Add the meeting point.');
  }
  if (has('meetingPointUrl')) out.meetingPointUrl = str(body.meetingPointUrl, 500) || undefined;
  if (need('capacity')) {
    out.capacity = has('capacity') ? Number(body.capacity) : DEFAULT_CAPACITY;
    if (!Number.isInteger(out.capacity) || out.capacity < 1 || out.capacity > MAX_CAPACITY) throw bad(`Capacity must be 1–${MAX_CAPACITY}.`);
  }
  if (need('price')) {
    out.price = round2(Number(body.price));
    if (!(out.price >= 0) || out.price > 10000) throw bad('Enter a valid price.');
  }
  if (has('status')) {
    if (!STATUSES.includes(body.status as TripStatus)) throw bad('Invalid status.');
    out.status = body.status as TripStatus;
  }
  if (has('onlineSales') || !partial) out.onlineSales = body.onlineSales !== false;
  if (has('driverIds')) {
    if (!Array.isArray(body.driverIds)) throw bad('driverIds must be a list.');
    out.driverIds = (body.driverIds as unknown[]).map((d) => str(d, 32)).filter(Boolean).slice(0, 5);
  }
  if (has('notes')) out.notes = str(body.notes, 1000) || undefined;
  if (has('code')) out.code = str(body.code, 24).toUpperCase() || undefined;
  return out;
}

tripsRouter.post(
  '/',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'trips.manage');
    const input = readTripInput(req.body, false);
    const id = newId('TR', 8);
    const trip: Trip = {
      id,
      code: input.code || `${(input.destination || input.name || 'TRIP').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()}-${input.date!.slice(5).replace('-', '')}`,
      name: input.name!,
      destination: input.destination!,
      date: input.date!,
      departureTime: input.departureTime!,
      meetingPoint: input.meetingPoint!,
      meetingPointUrl: input.meetingPointUrl,
      capacity: input.capacity!,
      price: input.price!,
      currency: 'EUR',
      status: 'scheduled',
      onlineSales: input.onlineSales ?? true,
      driverIds: input.driverIds ?? [],
      notes: input.notes,
      createdBy: staff.id,
      createdAt: nowIso(),
    };
    await col.trips().doc(id).set(stripUndefined(trip));
    audit(staff.id, 'trip.create', { tripId: id });
    res.status(201).json(trip);
  }),
);

tripsRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const staff = requirePermission(req, 'trips.manage');
    const ref = col.trips().doc(String(req.params.id));
    const trip = (await ref.get()).data() as Trip | undefined;
    if (!trip) throw notFound('Trip not found.');
    const patch = readTripInput(req.body, true);
    if (patch.capacity !== undefined && patch.capacity < trip.capacity) {
      const taken = await takenSeats(trip.id);
      const over = taken.filter((s) => s > patch.capacity!);
      if (over.length) throw conflict(`Seats ${over.join(', ')} are booked. Move those passengers before reducing capacity.`);
    }
    const updated = stripUndefined({ ...trip, ...patch, updatedAt: nowIso() });
    await ref.set(updated);
    audit(staff.id, 'trip.update', { tripId: trip.id, fields: Object.keys(patch) });
    res.json(updated);
  }),
);

tripsRouter.get(
  '/:id/manifest',
  handle(async (req, res) => {
    const staff = me(req);
    if (!can(staff.role, 'manifest.view')) throw forbidden();
    const trip = await getTripFor(staff, String(req.params.id));
    const [ticketsSnap, bookingsSnap] = await Promise.all([
      col.tickets().where('tripId', '==', trip.id).get(),
      col.bookings().where('tripId', '==', trip.id).get(),
    ]);
    const bookings = new Map<string, Booking>(bookingsSnap.docs.map((d: { id: string; data(): unknown }) => [d.id, d.data() as Booking]));
    const rows: ManifestRow[] = ticketsSnap.docs
      .map((d) => d.data() as Ticket)
      .filter((t) => t.status !== 'cancelled' || req.query.includeCancelled === '1')
      .sort((a, b) => a.seat - b.seat)
      .map((ticket) => {
        const b = bookings.get(ticket.bookingId)!;
        const showContact = staff.role !== 'partner' || b.partnerId === staff.partnerId;
        return {
          ticket,
          booking: {
            id: b.id,
            payer: showContact ? b.payer : { name: b.payer.name },
            channel: b.channel,
            payment: b.payment,
            platform: b.platform,
            externalRef: b.externalRef,
            sellerId: b.sellerId,
            notes: b.notes,
          },
        };
      });
    res.json({ trip, rows });
  }),
);
