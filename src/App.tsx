import React, { useEffect } from 'react';
import { can } from '../shared/permissions';
import { useLocation, match, navigate } from './lib/router';
import { useSession } from './lib/hooks';
import { BookingPage } from './pages/public/BookingPage';
import { SuccessPage } from './pages/public/SuccessPage';
import { PassPage } from './pages/public/PassPage';
import { LoginPage } from './pages/staff/LoginPage';
import { StaffShell, NAV, homeFor } from './pages/staff/StaffShell';
import { TripsPage } from './pages/staff/TripsPage';
import { TripDetailPage } from './pages/staff/TripDetailPage';
import { ScanPage } from './pages/staff/ScanPage';
import { SellPage } from './pages/staff/SellPage';
import { BookingsPage } from './pages/staff/BookingsPage';
import { ReportsPage } from './pages/staff/ReportsPage';
import { TeamPage } from './pages/staff/TeamPage';
import { PaymentsPage } from './pages/staff/PaymentsPage';

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to]);
  return null;
}

export default function App() {
  const { path, search } = useLocation();
  const session = useSession();

  // ---- Public: customers -------------------------------------------------
  let m: Record<string, string> | null;
  if ((m = match('/book/:slot/success', path))) return <SuccessPage search={search} />;
  if ((m = match('/book/:slot', path))) return <BookingPage key={m.slot} slot={m.slot} search={search} />;
  if ((m = match('/pass/:code', path))) return <PassPage code={m.code} />;
  if (path === '/book') return <Redirect to="/book/1" />;

  // ---- Staff -------------------------------------------------------------
  if (path === '/login') return session ? <Redirect to={homeFor(session.staff)} /> : <LoginPage />;
  if (!session) return <Redirect to="/login" />;
  const staff = session.staff;

  let page: React.ReactNode = null;
  if ((m = match('/app/trips/:id', path))) page = <TripDetailPage key={m.id} id={m.id} staff={staff} />;
  else if (path === '/app/trips') page = <TripsPage staff={staff} />;
  else if (path === '/app/scan') page = <ScanPage staff={staff} search={search} />;
  else if (path === '/app/sell' && can(staff.role, 'bookings.create')) page = <SellPage staff={staff} search={search} />;
  else if (path === '/app/bookings') page = <BookingsPage staff={staff} />;
  else if (path === '/app/reports') page = <ReportsPage staff={staff} />;
  else if (path === '/app/team' && can(staff.role, 'staff.manage')) page = <TeamPage staff={staff} />;
  else if (path === '/app/payments' && can(staff.role, 'partners.manage')) page = <PaymentsPage />;

  // Unknown or not-allowed page: go home. (The server enforces access anyway.)
  const allowed = page && (path.startsWith('/app/trips/') || NAV.some((n) => n.to === path && n.show(staff)));
  if (!allowed) return <Redirect to={homeFor(staff)} />;

  return (
    <StaffShell staff={staff} path={path}>
      {page}
    </StaffShell>
  );
}
