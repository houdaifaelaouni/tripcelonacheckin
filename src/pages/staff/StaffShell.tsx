import React from 'react';
import { BarChart3, Bus, CalendarDays, LogOut, Receipt, ScanLine, ShoppingCart, Users, Wallet } from 'lucide-react';
import type { PublicStaff } from '../../../shared/types';
import { can, ROLE_INFO, type Permission } from '../../../shared/permissions';
import { saveSession } from '../../lib/api';
import { navigate } from '../../lib/router';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (s: PublicStaff) => boolean;
}

const has = (p: Permission) => (s: PublicStaff) => can(s.role, p);

export const NAV: NavItem[] = [
  { to: '/app/trips', label: 'Trips', icon: CalendarDays, show: (s) => s.role !== 'driver' && can(s.role, 'trips.view') },
  { to: '/app/scan', label: 'Board', icon: ScanLine, show: has('checkin.scan') },
  { to: '/app/sell', label: 'Sell', icon: ShoppingCart, show: has('bookings.create') },
  { to: '/app/bookings', label: 'Bookings', icon: Receipt, show: (s) => ['bookings.viewAll', 'bookings.viewOwnPartner', 'bookings.viewOwnSales'].some((p) => can(s.role, p as Permission)) },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, show: (s) => s.role !== 'driver' },
  { to: '/app/team', label: 'Team & keys', icon: Users, show: has('staff.manage') },
  { to: '/app/payments', label: 'Partners & Stripe', icon: Wallet, show: has('partners.manage') },
];

export function homeFor(s: PublicStaff) {
  if (s.role === 'driver') return '/app/scan';
  if (s.role === 'seller') return '/app/sell';
  return '/app/trips';
}

export function StaffShell({ staff, path, children }: { staff: PublicStaff; path: string; children: React.ReactNode }) {
  const items = NAV.filter((n) => n.show(staff));
  const signOut = () => {
    saveSession(null);
    navigate('/login', true);
  };
  const link = (n: NavItem, mobile = false) => {
    const active = path.startsWith(n.to);
    return (
      <a
        key={n.to}
        href={n.to}
        onClick={(e) => {
          e.preventDefault();
          navigate(n.to);
        }}
        className={
          mobile
            ? `flex min-w-[68px] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-brand' : 'text-muted'}`
            : `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-paper'}`
        }
      >
        <n.icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
        {mobile ? n.label.split(' ')[0] : n.label}
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <Bus className="h-5 w-5" />
          </span>
          <div className="font-bold text-ink">Tripcelona</div>
        </div>
        <nav className="flex-1 space-y-1">{items.map((n) => link(n))}</nav>
        <div className="border-t border-line pt-4">
          <div className="px-1 text-sm font-semibold text-ink">{staff.name}</div>
          <div className="px-1 text-xs text-muted">{ROLE_INFO[staff.role].title}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 rounded-xl px-1 py-1 text-sm text-muted hover:text-ink">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <Bus className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-ink">{staff.name}</div>
            <div className="text-[11px] text-muted">{ROLE_INFO[staff.role].title}</div>
          </div>
        </div>
        <button onClick={signOut} className="rounded-lg p-2 text-muted" aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="px-4 pb-28 pt-6 md:ml-60 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {items.length > 1 && <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line bg-white md:hidden">{items.map((n) => link(n, true))}</nav>}
    </div>
  );
}
