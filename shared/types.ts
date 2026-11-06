// Shared data model for Tripcelona Check-in.
// Used by both the server (Firestore documents) and the client (API responses).

export const DEFAULT_CAPACITY = 55;
export const MAX_CAPACITY = 120;
export const HOLD_MINUTES = 30; // matches Stripe Checkout minimum session lifetime

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type Role = 'owner' | 'partner' | 'coordinator' | 'seller' | 'driver';

export const ROLES: Role[] = ['owner', 'partner', 'coordinator', 'seller', 'driver'];

// Owner and partners sign in with Google. Everyone else uses a personal access key.
export const GOOGLE_ROLES: Role[] = ['owner', 'partner'];
export const KEY_ROLES: Role[] = ['coordinator', 'seller', 'driver'];

// ---------------------------------------------------------------------------
// Partners (the two businesses). stripeSlot maps to STRIPE_SECRET_KEY_{slot}.
// The public booking link /book/{slot} charges that partner's Stripe account.
// ---------------------------------------------------------------------------

export type StripeSlot = 1 | 2;

export interface Partner {
  id: string;
  name: string;
  stripeSlot: StripeSlot;
  contactEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export interface Staff {
  id: string;
  name: string;
  role: Role;
  email?: string; // Google sign-in roles (owner, partner)
  partnerId?: string; // partner a partner-user belongs to; default revenue partner for a seller
  commissionRate?: number; // sellers: percent of booking amount, e.g. 10 = 10%
  phone?: string;
  active: boolean;
  keyLookupId?: string; // public part of the access key, used to find the staff member
  keyHash?: string; // scrypt hash of the secret part (never returned to clients)
  keyHint?: string; // last 4 characters, to recognise a key in the UI
  keyIssuedAt?: string;
  tokenVersion: number; // bumped on key reissue/revoke/deactivate to log out all devices
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PublicStaff = Omit<Staff, 'keyHash' | 'keyLookupId' | 'tokenVersion'>;

// ---------------------------------------------------------------------------
// Trips: one date, one coach, one meeting point.
// ---------------------------------------------------------------------------

export type TripStatus = 'scheduled' | 'boarding' | 'departed' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  code: string; // human code, e.g. "MONT-0412"
  name: string; // e.g. "Montserrat & Cava Day Trip"
  destination: string;
  date: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  meetingPoint: string;
  meetingPointUrl?: string; // Google Maps link
  capacity: number;
  price: number; // EUR per seat, public online price
  currency: 'EUR';
  status: TripStatus;
  onlineSales: boolean; // whether /book links can sell this trip
  driverIds: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Bookings: one purchase. Produces one ticket per passenger/seat.
// ---------------------------------------------------------------------------

export type Channel = 'online' | 'seller' | 'platform' | 'group';
export type PaymentMethod = 'stripe' | 'cash' | 'card_terminal' | 'platform' | 'invoice' | 'free';
export type PaymentStatus = 'pending' | 'paid' | 'unpaid' | 'refunded';
export type BookingStatus = 'held' | 'confirmed' | 'cancelled' | 'expired';

export const PLATFORMS = ['GetYourGuide', 'Viator', 'Airbnb Experiences', 'Civitatis', 'Klook', 'Other'] as const;

export interface Booking {
  id: string;
  tripId: string;
  channel: Channel;
  status: BookingStatus;
  partnerId: string; // whose revenue this is
  payer: { name: string; email?: string; phone?: string };
  seats: number[];
  amount: number; // total EUR
  currency: 'EUR';
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    stripeSlot?: StripeSlot;
    stripeSessionId?: string;
    paymentIntentId?: string;
    paidAt?: string;
  };
  platform?: string; // when channel === 'platform'
  externalRef?: string; // platform booking reference / group reference
  sellerId?: string;
  commission?: { rate: number; amount: number; settled: boolean; settledAt?: string };
  holdExpiresAt?: string; // online checkout holds
  paymentUrl?: string; // Stripe link sent to the customer for a staff sale
  emailStatus?: 'sent' | 'skipped' | 'failed';
  passengerNames?: string[]; // kept on held bookings until tickets are issued
  cancelledBy?: string;
  notes?: string;
  createdBy: string; // staff id or 'public'
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Tickets: one per passenger, with its own signed QR code.
// ---------------------------------------------------------------------------

export type TicketStatus = 'valid' | 'checked_in' | 'cancelled';

export interface Ticket {
  id: string;
  bookingId: string;
  tripId: string;
  seat: number;
  passengerName: string;
  status: TicketStatus;
  code: string; // signed QR payload "TC1.<ticketId>.<sig>"
  checkedInAt?: string;
  checkedInBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// Seat lock document: trips/{tripId}/seats/{seat}. Its existence is the lock.
export interface SeatLock {
  seat: number;
  bookingId: string;
  state: 'held' | 'sold';
  expiresAt?: string; // only for 'held'
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

export interface SessionInfo {
  token: string;
  staff: PublicStaff;
  expiresAt: string;
}

export type ScanOutcome = 'boarded' | 'already_boarded' | 'wrong_trip' | 'cancelled' | 'invalid' | 'unpaid';

export interface ScanResult {
  outcome: ScanOutcome;
  message: string;
  ticket?: Ticket;
  booking?: Pick<Booking, 'id' | 'payer' | 'channel' | 'payment' | 'platform' | 'externalRef'>;
  trip?: Pick<Trip, 'id' | 'code' | 'name' | 'date'>;
}

export interface PublicTrip {
  id: string;
  code: string;
  name: string;
  destination: string;
  date: string;
  departureTime: string;
  meetingPoint: string;
  meetingPointUrl?: string;
  price: number;
  currency: 'EUR';
  capacity: number;
  seatsTaken: number[];
}

export interface PublicPass {
  ticket: Pick<Ticket, 'id' | 'seat' | 'passengerName' | 'status' | 'code' | 'checkedInAt'>;
  trip: Omit<PublicTrip, 'seatsTaken' | 'capacity' | 'price'>;
  bookingId: string;
  paid: boolean;
}

export interface ManifestRow {
  ticket: Ticket;
  booking: Pick<Booking, 'id' | 'payer' | 'channel' | 'payment' | 'platform' | 'externalRef' | 'sellerId' | 'notes'>;
}

export interface TripSummary extends Trip {
  sold: number;
  held: number;
  boarded: number;
  revenue: number;
}
