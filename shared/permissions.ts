import type { Role } from './types.js';

// Every action the staff app can perform. The server checks these on each
// request; the client uses the same map only to decide what to show.
export type Permission =
  | 'trips.view' // see trips list & details
  | 'trips.manage' // create / edit / cancel trips, assign drivers
  | 'manifest.view' // passenger list for a trip
  | 'manifest.edit' // move seats, cancel tickets, mark paid
  | 'bookings.create' // sell: walk-up, platform, group
  | 'bookings.viewAll' // every booking
  | 'bookings.viewOwnPartner' // bookings whose revenue belongs to my partner
  | 'bookings.viewOwnSales' // bookings I sold
  | 'checkin.scan' // board passengers
  | 'staff.manage' // invite staff, issue / revoke access keys
  | 'partners.manage' // partners and their Stripe slot
  | 'reports.all' // revenue for everyone
  | 'reports.ownPartner' // revenue for my partner
  | 'commissions.viewAll'
  | 'commissions.settle'
  | 'commissions.viewOwn';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'trips.view',
    'trips.manage',
    'manifest.view',
    'manifest.edit',
    'bookings.create',
    'bookings.viewAll',
    'checkin.scan',
    'staff.manage',
    'partners.manage',
    'reports.all',
    'commissions.viewAll',
    'commissions.settle',
  ],
  partner: ['trips.view', 'manifest.view', 'bookings.viewOwnPartner', 'reports.ownPartner'],
  coordinator: [
    'trips.view',
    'trips.manage',
    'manifest.view',
    'manifest.edit',
    'bookings.create',
    'bookings.viewAll',
    'checkin.scan',
    'commissions.viewAll',
  ],
  seller: ['trips.view', 'bookings.create', 'bookings.viewOwnSales', 'commissions.viewOwn'],
  driver: ['manifest.view', 'checkin.scan'],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_INFO: Record<Role, { title: string; summary: string; signIn: 'google' | 'key' }> = {
  owner: {
    title: 'Owner',
    summary: 'Full control: partners, Stripe accounts, staff, access keys and all reports.',
    signIn: 'google',
  },
  partner: {
    title: 'Partner',
    summary: 'Read-only view of bookings and revenue for their own business.',
    signIn: 'google',
  },
  coordinator: {
    title: 'Coordinator',
    summary: 'Creates trips, assigns drivers, manages manifests and seat changes.',
    signIn: 'key',
  },
  seller: {
    title: 'Seller',
    summary: 'Sells walk-up, platform and group bookings and tracks their commission.',
    signIn: 'key',
  },
  driver: {
    title: 'Driver',
    summary: "Sees their assigned trip's manifest and scans passengers on board.",
    signIn: 'key',
  },
};
