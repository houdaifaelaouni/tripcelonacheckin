import { TravelTrip, Ticket, ValidationScanResult, DEFAULT_CAPACITY, SystemSettings, StripeAccountConfig } from '../types';
import { createTicketQrPayload } from './qr';
import { 
  createCloudTrip, 
  updateCloudTrip, 
  deleteCloudTrip, 
  createCloudTicket, 
  toggleCloudCheckInStatus, 
  deleteCloudTicket,
  saveCloudStripeSettings 
} from '../lib/firebase';

const TRIPS_STORAGE_KEY = 'tripcelona_trips_cloud_cache_v3';
const TICKETS_STORAGE_KEY = 'tripcelona_tickets_cloud_cache_v3';
export const STRIPE_SETTINGS_KEY = 'tripcelona_stripe_split_config_v1';

export const DEFAULT_STRIPE_SETTINGS: SystemSettings = {
  stripeAccount1: {
    id: 'account_1',
    label: 'Stripe Account 1 (Seats 1–28)',
    publishableKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY_1) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY) || 'pk_test_51TripcelonaAcc1LiveGate001',
    isActive: true,
    description: 'Processes payments for the first half of bus seats',
    seatsCovered: 'Seats 1 to 28 (First 50%)',
  },
  stripeAccount2: {
    id: 'account_2',
    label: 'Stripe Account 2 (Seats 29–55)',
    publishableKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY_2) || 'pk_test_51TripcelonaAcc2LiveGate002',
    isActive: true,
    description: 'Processes payments for the second half of bus seats',
    seatsCovered: 'Seats 29 to 55 (Second 50%)',
  },
};

// Empty by default - zero fake demo data per user request
const INITIAL_TRIPS: TravelTrip[] = [];
const INITIAL_TICKETS: Ticket[] = [];

// Broadcast channel for multi-tab synchronization
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('tripcelona_sync_bus');
  } catch {
    syncChannel = null;
  }
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === TRIPS_STORAGE_KEY || e.key === TICKETS_STORAGE_KEY) {
      callback();
    }
  };

  const handleChannel = (e: MessageEvent) => {
    if (e.data?.type === 'DATA_UPDATED') {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  if (syncChannel) {
    syncChannel.addEventListener('message', handleChannel);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleChannel);
    }
  };
}

function notifyDataChanged() {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

export function getTrips(): TravelTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTripsCache(trips: TravelTrip[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
    notifyDataChanged();
  } catch (e) {
    console.error('Failed to save trips cache:', e);
  }
}

export function getTickets(): Ticket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTicketsCache(tickets: Ticket[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    notifyDataChanged();
  } catch (e) {
    console.error('Failed to save tickets cache:', e);
  }
}

export function getOccupiedSeats(tripId: string, ticketsList?: Ticket[]): number[] {
  const allTickets = ticketsList ?? getTickets();
  const now = Date.now();
  const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes hold

  return allTickets
    .filter(t => {
      if (t.tripId !== tripId) return false;
      if (t.status === 'cancelled') return false;
      if (t.paymentStatus === 'paid') return true;
      if (t.paymentStatus === 'pending') {
        const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        return now - createdAt < HOLD_DURATION_MS;
      }
      return t.status === 'valid' || t.status === 'checked_in';
    })
    .map(t => t.seatNumber)
    .sort((a, b) => a - b);
}

export function getNextAvailableSeat(tripId: string, capacity: number = DEFAULT_CAPACITY, ticketsList?: Ticket[]): number | null {
  const occupied = new Set(getOccupiedSeats(tripId, ticketsList));
  for (let i = 1; i <= capacity; i++) {
    if (!occupied.has(i)) {
      return i;
    }
  }
  return null;
}

export async function createTrip(tripData: {
  name: string;
  date: string;
  time?: string;
  origin: string;
  destination: string;
  viajesNumber: string;
  capacity?: number;
  price?: number;
  currency?: string;
  notes?: string;
}): Promise<TravelTrip> {
  const trips = getTrips();
  const normalizedViaje = tripData.viajesNumber.trim().toUpperCase();

  const existing = trips.find(t => t.viajesNumber.toUpperCase() === normalizedViaje);
  if (existing) {
    throw new Error(`Travel code "${normalizedViaje}" already exists. Please choose a unique Viaje code.`);
  }

  const customCapacity = tripData.capacity && tripData.capacity > 0 ? Number(tripData.capacity) : DEFAULT_CAPACITY;
  const tripPrice = tripData.price !== undefined ? Math.max(0, Number(tripData.price)) : 25;

  try {
    // Cloud Firestore creation
    const cloudTrip = await createCloudTrip({
      name: tripData.name.trim(),
      date: tripData.date,
      time: tripData.time || '08:00',
      origin: tripData.origin.trim(),
      destination: tripData.destination.trim(),
      viajesNumber: normalizedViaje,
      capacity: customCapacity,
      price: tripPrice,
      currency: tripData.currency || 'EUR',
      notes: tripData.notes?.trim() || '',
      status: 'scheduled',
    });

    const updated = [cloudTrip, ...trips];
    saveTripsCache(updated);
    return cloudTrip;
  } catch (err) {
    // Local fallback if offline
    console.warn('Saving trip to local cache:', err);
    const localId = `TRIP-${Date.now().toString(36).toUpperCase()}`;
    const newTrip: TravelTrip = {
      id: localId,
      name: tripData.name.trim(),
      date: tripData.date,
      time: tripData.time || '08:00',
      origin: tripData.origin.trim(),
      destination: tripData.destination.trim(),
      viajesNumber: normalizedViaje,
      capacity: customCapacity,
      price: tripPrice,
      currency: tripData.currency || 'EUR',
      notes: tripData.notes?.trim() || '',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    saveTripsCache([newTrip, ...trips]);
    return newTrip;
  }
}

export async function updateTrip(tripId: string, updates: Partial<TravelTrip>): Promise<void> {
  const trips = getTrips();
  const idx = trips.findIndex(t => t.id === tripId);
  if (idx !== -1) {
    trips[idx] = { ...trips[idx], ...updates, updatedAt: new Date().toISOString() };
    saveTripsCache(trips);
  }
  try {
    await updateCloudTrip(tripId, updates);
  } catch (err) {
    console.warn('Failed cloud update, cached locally:', err);
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  const trips = getTrips().filter(t => t.id !== tripId);
  saveTripsCache(trips);

  // Also remove associated tickets
  const tickets = getTickets().filter(t => t.tripId !== tripId);
  saveTicketsCache(tickets);

  try {
    await deleteCloudTrip(tripId);
  } catch (err) {
    console.warn('Failed cloud delete, removed locally:', err);
  }
}

export async function createTicket(params: {
  tripId: string;
  firstName: string;
  lastName: string;
  destination: string;
  seatNumber?: number;
  preferredSeat?: number;
  capacity?: number;
  status?: 'pending' | 'checked_in' | 'cancelled' | 'valid';
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  amountPaid?: number;
  paymentIntentId?: string;
  paymentMethod?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  emailDeliveryStatus?: 'sent' | 'pending' | 'failed';
  whatsappDeliveryStatus?: 'sent' | 'ready';
  stripeAccountUsed?: 'account_1' | 'account_2';
  stripeAccountLabel?: string;
}): Promise<Ticket> {
  const trips = getTrips();
  const trip = trips.find(t => t.id === params.tripId);
  if (!trip) {
    throw new Error('Selected travel could not be found.');
  }

  const tripCapacity = params.capacity || trip.capacity || DEFAULT_CAPACITY;
  const occupied = getOccupiedSeats(trip.id);
  if (occupied.length >= tripCapacity) {
    throw new Error(`This travel has reached its maximum customized capacity (${tripCapacity} places). No more passes can be created.`);
  }

  const targetSeat = params.seatNumber || params.preferredSeat;
  let assignedSeat: number;
  if (targetSeat) {
    if (targetSeat < 1 || targetSeat > tripCapacity) {
      throw new Error(`Seat #${targetSeat} is invalid. Valid places are 1 to ${tripCapacity}.`);
    }
    if (occupied.includes(targetSeat)) {
      throw new Error(`Seat #${targetSeat} is already occupied. Please select an available seat.`);
    }
    assignedSeat = targetSeat;
  } else {
    const next = getNextAvailableSeat(trip.id, tripCapacity);
    if (!next) {
      throw new Error('No places are currently available on this coach.');
    }
    assignedSeat = next;
  }
  const resolvedStripeAccount: 'account_1' | 'account_2' = 
    params.stripeAccountUsed || 'account_1';
  const resolvedStripeLabel: string = 
    params.stripeAccountLabel || (resolvedStripeAccount === 'account_1' ? 'Stripe Account 1' : 'Stripe Account 2');

  try {
    // Cloud Firestore create
    const cloudTicket = await createCloudTicket({
      tripId: trip.id,
      firstName: params.firstName,
      lastName: params.lastName,
      destination: params.destination,
      seatNumber: assignedSeat,
      status: params.status || 'valid',
      paymentStatus: params.paymentStatus || 'unpaid',
      amountPaid: params.amountPaid,
      paymentIntentId: params.paymentIntentId,
      paymentMethod: params.paymentMethod,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      whatsappNumber: params.whatsappNumber,
      emailDeliveryStatus: params.emailDeliveryStatus || 'sent',
      whatsappDeliveryStatus: params.whatsappDeliveryStatus || 'ready',
      stripeAccountUsed: resolvedStripeAccount,
      stripeAccountLabel: resolvedStripeLabel,
    });

    const tickets = getTickets();
    saveTicketsCache([cloudTicket, ...tickets]);
    return cloudTicket;
  } catch (err) {
    console.warn('Saving ticket locally due to cloud err:', err);
    const cleanFirst = params.firstName.trim();
    const cleanLast = params.lastName.trim();
    const ticketId = `${trip.viajesNumber}-${String(assignedSeat).padStart(3, '0')}`;
    const qr = createTicketQrPayload(ticketId, trip.id, `${cleanFirst} ${cleanLast}`);

    const newTicket: Ticket = {
      id: ticketId,
      tripId: trip.id,
      firstName: cleanFirst,
      lastName: cleanLast,
      destination: params.destination.trim() || trip.destination,
      seatNumber: assignedSeat,
      qrPayload: qr,
      status: params.status || 'valid',
      paymentStatus: params.paymentStatus || 'unpaid',
      amountPaid: params.amountPaid,
      paymentIntentId: params.paymentIntentId,
      paymentMethod: params.paymentMethod,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      whatsappNumber: params.whatsappNumber,
      emailDeliveryStatus: params.emailDeliveryStatus || 'sent',
      whatsappDeliveryStatus: params.whatsappDeliveryStatus || 'ready',
      stripeAccountUsed: resolvedStripeAccount,
      stripeAccountLabel: resolvedStripeLabel,
      checkedInAt: null,
      createdAt: new Date().toISOString(),
    };

    const tickets = getTickets();
    saveTicketsCache([newTicket, ...tickets]);
    return newTicket;
  }
}

// Stripe Settings Helpers
export function getStripeSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_STRIPE_SETTINGS;
  try {
    const raw = localStorage.getItem(STRIPE_SETTINGS_KEY);
    if (!raw) return DEFAULT_STRIPE_SETTINGS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STRIPE_SETTINGS;
  }
}

export function saveStripeSettingsCache(settings: SystemSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STRIPE_SETTINGS_KEY, JSON.stringify(settings));
  }
  notifyDataChanged();
}

export async function saveStripeSettings(settings: SystemSettings): Promise<void> {
  saveStripeSettingsCache(settings);
  try {
    await saveCloudStripeSettings(settings);
  } catch (err) {
    console.warn('Saved Stripe settings locally, cloud sync error:', err);
  }
}

// Numerical 50/50 seat split resolver: Seats 1..ceil(capacity/2) -> account_1, rest -> account_2
export function getStripeAccountForSeat(seatNumber: number, capacity: number = DEFAULT_CAPACITY): 'account_1' | 'account_2' {
  const halfCap = Math.ceil(capacity / 2);
  return seatNumber <= halfCap ? 'account_1' : 'account_2';
}

// Format clean WhatsApp pass sharing link
export function generateWhatsAppPassUrl(
  ticket: Ticket, 
  trip?: TravelTrip | null, 
  customValidationUrl?: string
): string {
  const phone = (ticket.whatsappNumber || ticket.contactPhone || '').replace(/[^\d+]/g, '');
  const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tripcelona.com';
  const passUrl = customValidationUrl || `${originUrl}?validate=${encodeURIComponent(ticket.id)}`;

  const travelName = trip ? `${trip.viajesNumber} — ${trip.name}` : ticket.destination;
  const departureInfo = trip ? `${trip.date} at ${trip.time || '08:30 AM'}` : 'Scheduled Departure';
  const originInfo = trip ? trip.origin : 'Barcelona Estació';
  const capacityInfo = trip ? `(of ${trip.capacity || 55})` : '';

  const message = 
    `🎟️ *Tripcelona Digital Boarding Pass*\n\n` +
    `Hello *${ticket.firstName}*,\n` +
    `Your reservation has been confirmed!\n\n` +
    `• *Travel:* ${travelName}\n` +
    `• *Destination:* ${ticket.destination}\n` +
    `• *Departure:* ${departureInfo}\n` +
    `• *Boarding Origin:* ${originInfo}\n` +
    `• *Coach Seat:* Place #${ticket.seatNumber} ${capacityInfo}\n` +
    `• *Pass ID:* ${ticket.id}\n` +
    `• *Status:* Confirmed & Paid (€${(ticket.amountPaid || trip?.price || 25).toFixed(2)})\n\n` +
    `📲 *Open your Optical QR Boarding Pass for driver check-in:*\n` +
    `${passUrl}\n\n` +
    `_Tripcelona Coach Services · Safe Journeys Across Catalonia_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function toggleCheckInStatus(ticketId: string, conductorName?: string): Promise<Ticket | null> {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === ticketId);
  if (idx === -1) return null;

  const current = tickets[idx];
  const newStatus = current.status === 'checked_in' ? 'pending' : 'checked_in';
  const checkedInAt = newStatus === 'checked_in' ? new Date().toISOString() : null;

  tickets[idx] = {
    ...current,
    status: newStatus,
    checkedInAt,
    checkedInBy: newStatus === 'checked_in' ? (conductorName || 'Driver') : undefined,
    updatedAt: new Date().toISOString(),
  };

  saveTicketsCache(tickets);

  try {
    await toggleCloudCheckInStatus(ticketId, current.status, conductorName);
  } catch (err) {
    console.warn('Failed cloud check-in toggle, applied locally:', err);
  }

  return tickets[idx];
}

export async function deleteTicket(ticketId: string): Promise<boolean> {
  const tickets = getTickets().filter(t => t.id !== ticketId);
  saveTicketsCache(tickets);
  try {
    await deleteCloudTicket(ticketId);
  } catch (err) {
    console.warn('Failed cloud ticket delete, removed locally:', err);
  }
  return true;
}

export function validateTicketPayloadOrId(payloadOrId: string): ValidationScanResult {
  const tickets = getTickets();
  const trips = getTrips();
  const now = new Date().toISOString();

  let targetTicketId = payloadOrId.trim();

  // Try parsing JSON QR
  if (targetTicketId.startsWith('{')) {
    try {
      const parsed = JSON.parse(targetTicketId);
      if (parsed.ticketId) {
        targetTicketId = parsed.ticketId;
      }
    } catch {
      // not JSON
    }
  }

  // Also check URL parameters like ?validate=...
  if (targetTicketId.includes('validate=')) {
    const match = targetTicketId.match(/validate=([^&]+)/);
    if (match && match[1]) {
      targetTicketId = decodeURIComponent(match[1]);
    }
  }

  const ticket = tickets.find(t => t.id.toLowerCase() === targetTicketId.toLowerCase());
  if (!ticket) {
    return {
      success: false,
      statusType: 'not_found',
      message: `No passenger ticket found for code "${targetTicketId}". Verify code or scan original pass.`,
      scannedAt: now,
    };
  }

  const trip = trips.find(t => t.id === ticket.tripId);

  if (ticket.status === 'cancelled') {
    return {
      success: false,
      statusType: 'cancelled',
      message: `Boarding Denied: Ticket #${ticket.id} for ${ticket.firstName} ${ticket.lastName} was cancelled.`,
      ticket,
      trip,
      scannedAt: now,
    };
  }

  if (ticket.status === 'checked_in') {
    return {
      success: false,
      statusType: 'already_checked_in',
      message: `Warning: ${ticket.firstName} ${ticket.lastName} (Seat #${ticket.seatNumber}) was ALREADY checked in at ${ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'earlier'}. Duplicate boarding alert!`,
      ticket,
      trip,
      scannedAt: now,
    };
  }

  // Mark as checked in
  toggleCheckInStatus(ticket.id);

  return {
    success: true,
    statusType: 'success',
    message: `Passenger Verified! ${ticket.firstName} ${ticket.lastName} checked in for Seat #${ticket.seatNumber} (${ticket.destination}).`,
    ticket: { ...ticket, status: 'checked_in', checkedInAt: now },
    trip,
    scannedAt: now,
  };
}

export function resetAllDataToCleanSlate(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TRIPS_STORAGE_KEY);
  localStorage.removeItem(TICKETS_STORAGE_KEY);
  notifyDataChanged();
}
