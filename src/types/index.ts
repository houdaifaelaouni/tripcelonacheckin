export const DEFAULT_CAPACITY = 55;
export const MAX_SEATS_PER_TRAVEL = 200;

export type UserRole = 'admin' | 'driver' | 'ticketing_agent' | 'travel_creator';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  badge: string;
  description: string;
  color: string;
  responsibilities: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    title: 'Executive Admin',
    badge: 'Admin Access',
    description: 'Master access to all travels, passenger manifests, system settings, and team role management.',
    color: '#0052F2',
    responsibilities: [
      'Manage dashboard metrics & analytics',
      'Create and edit travels & custom capacities',
      'Generate boarding passes & QR codes',
      'Validate passengers with live QR scanner',
      'Manage team members & assign roles',
      'Delete or archive records',
    ],
  },
  driver: {
    id: 'driver',
    title: 'Bus Driver / Conductor',
    badge: 'Check-in Validator',
    description: 'Validates passengers boarding the coach using the live camera QR scanner.',
    color: '#13171A',
    responsibilities: [
      'Live camera QR pass scanning',
      'Instant boarding verification & audio feedback',
      'Duplicate check-in prevention',
      'View passenger manifest & seat numbers',
    ],
  },
  ticketing_agent: {
    id: 'ticketing_agent',
    title: 'Ticketing Agent / Host',
    badge: 'Pass Generator',
    description: 'Registers passenger name, surname, destination, and assigns coach seats to generate passes.',
    color: '#0052F2',
    responsibilities: [
      'Register passenger name & surname',
      'Select travel & assign coach seat (1 to capacity)',
      'Generate scannable QR passes',
      'Download high-res PNG & print boarding passes',
      'Share pass links with travelers',
    ],
  },
  travel_creator: {
    id: 'travel_creator',
    title: 'Travel Coordinator / Creator',
    badge: 'Travels & Places',
    description: 'Creates new bus departures, customizes place capacity, routes, schedules, and destinations.',
    color: '#50565B',
    responsibilities: [
      'Create new travels & viaje identifiers',
      'Customize places / bus capacity (e.g. 55, 60, 40)',
      'Set travel origins, destinations, dates & times',
      'Monitor seat booking progress',
    ],
  },
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelTrip {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  origin: string;
  destination: string;
  viajesNumber: string; // Travel code e.g. "VIAJE-01"
  capacity: number; // customizable places capacity, e.g. 55
  price?: number; // customizable ticket price in EUR (e.g. 25.00)
  currency?: string; // e.g. "EUR"
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Ticket {
  id: string; // e.g. "VIAJE01-042"
  tripId: string;
  firstName: string;
  lastName: string; // surname
  destination: string;
  seatNumber: number; // 1 to capacity
  qrPayload: string;
  status: 'pending' | 'checked_in' | 'cancelled' | 'valid';
  checkedInAt: string | null;
  checkedInBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  emailDeliveryStatus?: 'sent' | 'pending' | 'failed';
  whatsappDeliveryStatus?: 'sent' | 'ready';
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  amountPaid?: number;
  paymentIntentId?: string;
  paymentMethod?: string;
  stripeAccountUsed?: 'account_1' | 'account_2';
  stripeAccountLabel?: string;
}

export interface StripeAccountConfig {
  id: 'account_1' | 'account_2';
  label: string;
  publishableKey: string;
  secretKey?: string;
  description?: string;
  isActive: boolean;
  seatsCovered?: string;
}

export interface SystemSettings {
  stripeAccount1: StripeAccountConfig;
  stripeAccount2: StripeAccountConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ValidationScanResult {
  success: boolean;
  statusType: 'success' | 'already_checked_in' | 'invalid_trip' | 'not_found' | 'cancelled';
  message: string;
  ticket?: Ticket;
  trip?: TravelTrip;
  scannedAt: string;
}
