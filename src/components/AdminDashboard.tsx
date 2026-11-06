import React, { useState } from 'react';
import { 
  Bus, 
  Users, 
  QrCode, 
  ScanLine, 
  Armchair, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Plus, 
  Settings, 
  Copy, 
  Check, 
  ExternalLink,
  Edit2,
  Trash2,
  ArrowRight,
  Sparkles,
  CreditCard,
  Split,
  MessageCircle,
  Mail
} from 'lucide-react';
import { TravelTrip, Ticket, UserProfile, UserRole, ROLE_DEFINITIONS } from '../types';
import { updateUserRoleByAdmin } from '../lib/firebase';
import { generateWhatsAppPassUrl } from '../utils/storage';

interface AdminDashboardProps {
  trips: TravelTrip[];
  tickets: Ticket[];
  teamUsers: UserProfile[];
  activeTrip: TravelTrip | null;
  onSelectTrip: (trip: TravelTrip) => void;
  onOpenCreateTrip: () => void;
  onEditTrip: (trip: TravelTrip) => void;
  onDeleteTrip: (tripId: string) => void;
  onGoToCheckIn: () => void;
  onGoToValidator: () => void;
  onGoToShowcase?: () => void;
  onViewTicket: (ticket: Ticket) => void;
  onSwitchRole: (role: UserRole) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  trips,
  tickets,
  teamUsers,
  activeTrip,
  onSelectTrip,
  onOpenCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onGoToCheckIn,
  onGoToValidator,
  onGoToShowcase,
  onViewTicket,
  onSwitchRole,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Computations
  const totalTravels = trips.length;
  const totalCapacityPlaces = trips.reduce((acc, t) => acc + (t.capacity || 55), 0);
  const totalTickets = tickets.filter(t => t.status !== 'cancelled').length;
  const totalBoarded = tickets.filter(t => t.status === 'checked_in').length;
  const totalPending = totalTickets - totalBoarded;
  const overallOccupancy = totalCapacityPlaces > 0 ? Math.round((totalTickets / totalCapacityPlaces) * 100) : 0;

  // Compute revenue per account from paid reservations only (paymentStatus === 'paid')
  const paidTickets = tickets.filter(t => t.paymentStatus === 'paid' && t.status !== 'cancelled');
  const totalRevenue = paidTickets.reduce((acc, t) => acc + (t.amountPaid || 0), 0);

  const account1Revenue = paidTickets
    .filter(t => t.stripeAccountUsed === 'account_1')
    .reduce((acc, t) => acc + (t.amountPaid || 0), 0);

  const account2Revenue = paidTickets
    .filter(t => t.stripeAccountUsed === 'account_2')
    .reduce((acc, t) => acc + (t.amountPaid || 0), 0);

  const handleCopyPortalLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2500);
    } catch {
      // fallback
    }
  };

  const originUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const cleanOrigin = originUrl.replace(/\?.*/, '').replace(/\/+$/, '');
  const driverPortalUrl = `${originUrl}?portal=driver`;
  const agentPortalUrl = `${originUrl}?portal=agent`;
  const creatorPortalUrl = `${originUrl}?portal=creator`;
  const booking1Url = `${cleanOrigin}/book/1`;
  const booking2Url = `${cleanOrigin}/book/2`;

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    try {
      await updateUserRoleByAdmin(targetUid, newRole);
    } catch (err) {
      console.error('Role update failed:', err);
    }
  };

  return (
    <div className="w-full space-y-6 font-gellix animate-fade-in text-[#000000]">
      {/* Top Banner: Master Operations Hub */}
      <div className="w-full bg-[#13171A] text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#242A2E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-8 h-8 rounded-lg bg-[#0052F2] flex items-center justify-center text-white font-bold text-sm">
              TC
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Tripcelona Operations</h2>
            <span className="text-xs font-mono text-[#4083FF]">
              Executive Terminal · Cloud Active
            </span>
          </div>
          <p className="text-xs text-[#9FA5AD] mt-1 max-w-2xl leading-relaxed">
            Centralized Catalan transit coordination: customize bus coach capacity, allocate seats, issue printable passes, and validate boardings in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onGoToShowcase && (
            <button
              onClick={onGoToShowcase}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#242A2E] hover:bg-[#373D42] text-white border border-[#373D42] flex items-center gap-1.5 transition-colors min-h-[40px]"
              title="Open Stageshow interactive product visual demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4083FF]" />
              <span>Product Visuals</span>
            </button>
          )}

          <a
            href="/book/1"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#242A2E] hover:bg-[#373D42] text-white border border-[#373D42] flex items-center gap-1.5 transition-colors min-h-[40px]"
            title="Open Client Booking for Stripe Account 1"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#4083FF]" />
            <span>Book (Stripe 1)</span>
          </a>

          <a
            href="/book/2"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#242A2E] hover:bg-[#373D42] text-white border border-[#373D42] flex items-center gap-1.5 transition-colors min-h-[40px]"
            title="Open Client Booking for Stripe Account 2"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#4083FF]" />
            <span>Book (Stripe 2)</span>
          </a>

          <button
            onClick={onOpenCreateTrip}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create Travel &amp; Places</span>
          </button>

          <button
            onClick={onGoToCheckIn}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 min-h-[40px] bg-white text-[#000000]"
          >
            <QrCode className="w-4 h-4 text-[#0052F2]" />
            <span>New Check-in</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Stats Cards: 5 column responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Travels */}
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#0052F2] transition-colors">
          <div className="flex items-center justify-between text-[#697077] text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#50565B]">Total Departures</span>
            <Bus className="w-4 h-4 text-[#0052F2]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-[#000000] mt-1.5">
            {totalTravels}
          </div>
          <div className="text-[11px] text-[#697077] mt-1">
            {trips.filter(t => t.status === 'scheduled').length} scheduled departures
          </div>
        </div>

        {/* KPI 2: Total Places Capacity */}
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#0052F2] transition-colors">
          <div className="flex items-center justify-between text-[#697077] text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#50565B]">Coach Places</span>
            <Armchair className="w-4 h-4 text-[#0052F2]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-[#000000] mt-1.5">
            {totalCapacityPlaces}
          </div>
          <div className="text-[11px] text-[#0052F2] mt-1 font-medium">
            Customizable per bus
          </div>
        </div>

        {/* KPI 3: Passes Issued */}
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#0052F2] transition-colors">
          <div className="flex items-center justify-between text-[#697077] text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#50565B]">Passes Issued</span>
            <QrCode className="w-4 h-4 text-[#0052F2]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-[#000000] mt-1.5">
            {totalTickets}
          </div>
          <div className="text-[11px] text-[#697077] mt-1 font-mono">
            {overallOccupancy}% total capacity
          </div>
        </div>

        {/* KPI 4: Paid Revenue (Stripe Accounts 1 & 2) */}
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#0052F2] transition-colors">
          <div className="flex items-center justify-between text-[#697077] text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#50565B]">Paid Revenue</span>
            <CreditCard className="w-4 h-4 text-[#0052F2]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-[#0052F2] mt-1.5">
            €{totalRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#50565B] mt-1 space-y-0.5 border-t border-[#E5E9F0] pt-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#697077]">Stripe Acc 1:</span>
              <span className="font-bold text-[#000000]">€{account1Revenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#697077]">Stripe Acc 2:</span>
              <span className="font-bold text-[#000000]">€{account2Revenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Boarded / Validated */}
        <div className="bg-white border border-[#D5D9E0] rounded-xl p-4 sm:p-5 shadow-xs hover:border-[#0052F2] transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#697077] text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-[#50565B]">Boarded Passengers</span>
            <CheckCircle2 className="w-4 h-4 text-[#0052F2]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-[#000000] mt-1.5">
            {totalBoarded} <span className="text-sm font-normal text-[#697077]">/{totalTickets}</span>
          </div>
          <div className="text-[11px] text-[#697077] mt-1">
            {totalPending} pending boarding
          </div>
        </div>
      </div>

      {/* Role Portals Quick Links (Driver, Ticketing Agent, Travel Creator) */}
      <div className="bg-white border border-[#D5D9E0] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Dedicated Role Access Portals</h3>
            <p className="text-xs text-[#697077] mt-0.5">
              Each staff role has a specialized streamlined interface and direct link.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Driver Card */}
          <div className="p-4 rounded-xl border border-[#D5D9E0] bg-[#F2F4F8] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#000000] text-white flex items-center justify-center">
                  <ScanLine className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#000000] font-semibold border border-[#D5D9E0]">
                  Driver
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#000000] mt-2">Driver Validation Console</h4>
              <p className="text-xs text-[#697077] mt-1 leading-relaxed">
                Check-in scanner for the bus driver to scan passenger passes and verify seats.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9E0]">
              <button
                onClick={() => onSwitchRole('driver')}
                className="btn-primary flex-1 py-1.5 text-xs text-center min-h-[36px]"
              >
                Open Scanner
              </button>
              <button
                onClick={() => handleCopyPortalLink('driver', driverPortalUrl)}
                className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] min-h-[36px]"
                title="Copy direct driver link"
              >
                {copiedLink === 'driver' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Ticketing Agent Card */}
          <div className="p-4 rounded-xl border border-[#D5D9E0] bg-[#F2F4F8] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#0052F2] text-white flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#0052F2] font-semibold border border-[#D5D9E0]">
                  Lady Host
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#000000] mt-2">Ticketing Check-in Agent</h4>
              <p className="text-xs text-[#697077] mt-1 leading-relaxed">
                Generates passes with passenger name, surname, destination, and seat allocation.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9E0]">
              <button
                onClick={() => onSwitchRole('ticketing_agent')}
                className="btn-primary flex-1 py-1.5 text-xs text-center min-h-[36px]"
              >
                Open Generator
              </button>
              <button
                onClick={() => handleCopyPortalLink('agent', agentPortalUrl)}
                className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] min-h-[36px]"
                title="Copy direct agent link"
              >
                {copiedLink === 'agent' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Travel Creator Card */}
          <div className="p-4 rounded-xl border border-[#D5D9E0] bg-[#F2F4F8] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#50565B] text-white flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#50565B] font-semibold border border-[#D5D9E0]">
                  Travels
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#000000] mt-2">Travel &amp; Places Creator</h4>
              <p className="text-xs text-[#697077] mt-1 leading-relaxed">
                Creates new travels, sets departures, and customizes places / vehicle capacity.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9E0]">
              <button
                onClick={() => onSwitchRole('travel_creator')}
                className="btn-primary flex-1 py-1.5 text-xs text-center min-h-[36px]"
              >
                Manage Travels
              </button>
              <button
                onClick={() => handleCopyPortalLink('creator', creatorPortalUrl)}
                className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] min-h-[36px]"
                title="Copy creator link"
              >
                {copiedLink === 'creator' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Client Booking: Stripe Account 1 */}
          <div className="p-4 rounded-xl border border-[#D5D9E0] bg-[#F2F4F8] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#0052F2] text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#0052F2] font-semibold border border-[#D5D9E0]">
                  Stripe Acc 1
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#000000] mt-2">Client Booking · Gateway 1</h4>
              <p className="text-xs text-[#697077] mt-1 leading-relaxed">
                Direct booking link (/book/1). All seat payments process strictly via Stripe Account 1.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9E0]">
              <a
                href={booking1Url}
                className="btn-primary flex-1 py-1.5 text-xs text-center min-h-[36px] flex items-center justify-center gap-1"
              >
                <span>Book 1</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleCopyPortalLink('booking1', booking1Url)}
                className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] min-h-[36px]"
                title="Copy /book/1 link"
              >
                {copiedLink === 'booking1' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Client Booking: Stripe Account 2 */}
          <div className="p-4 rounded-xl border border-[#D5D9E0] bg-[#F2F4F8] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[#50565B] text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#50565B] font-semibold border border-[#D5D9E0]">
                  Stripe Acc 2
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[#000000] mt-2">Client Booking · Gateway 2</h4>
              <p className="text-xs text-[#697077] mt-1 leading-relaxed">
                Direct booking link (/book/2). All seat payments process strictly via Stripe Account 2.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9E0]">
              <a
                href={booking2Url}
                className="btn-primary flex-1 py-1.5 text-xs text-center min-h-[36px] flex items-center justify-center gap-1"
              >
                <span>Book 2</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleCopyPortalLink('booking2', booking2Url)}
                className="btn-secondary px-2.5 py-1.5 text-xs text-[#50565B] min-h-[36px]"
                title="Copy /book/2 link"
              >
                {copiedLink === 'booking2' ? <Check className="w-3.5 h-3.5 text-[#0052F2]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Travels Table (Customizable Places) & Recent Tickets Manifest */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Travels & Places Customization (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#D5D9E0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#D5D9E0] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-[#0052F2]" />
                <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Active Travels &amp; Capacity</h3>
              </div>
              <p className="text-xs text-[#697077] mt-0.5">
                Customize places, routes, and dates in the cloud
              </p>
            </div>

            <button
              onClick={onOpenCreateTrip}
              className="btn-primary px-3 py-1.5 text-xs font-medium flex items-center gap-1 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Travel</span>
            </button>
          </div>

          {trips.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Bus className="w-8 h-8 text-[#B9BFC7] mx-auto" />
              <p className="text-xs font-semibold text-[#000000]">No travels yet</p>
              <p className="text-[11px] text-[#697077]">
                Click &quot;Add Travel&quot; above to create your first scheduled travel with custom places.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#D5D9E0]">
              {trips.map((trip) => {
                const tripTickets = tickets.filter(t => t.tripId === trip.id && t.status !== 'cancelled');
                const booked = tripTickets.length;
                const capacity = trip.capacity || 55;
                const pct = Math.round((booked / capacity) * 100);

                return (
                  <div key={trip.id} className="p-4 hover:bg-[#F2F4F8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4F8] text-[#0052F2] border border-[#D5D9E0]">
                          {trip.viajesNumber}
                        </span>
                        <h4 className="font-semibold text-xs sm:text-sm text-[#000000] truncate">{trip.name}</h4>
                      </div>

                      <div className="text-[11px] text-[#697077]">
                        <span>{trip.date} • {trip.time || '08:00 AM'}</span>
                        <span className="mx-1.5">•</span>
                        <span>{trip.origin} ➔ {trip.destination}</span>
                      </div>

                      {/* Custom capacity badge */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-24 sm:w-32 bg-[#E5E9F0] h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${pct >= 100 ? 'bg-[#F23845]' : 'bg-[#0052F2]'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-[#000000]">
                          {booked} / {capacity} places <span className="text-[#697077] font-normal">({pct}%)</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => onEditTrip(trip)}
                        className="btn-secondary px-2.5 py-1 text-xs text-[#50565B] flex items-center gap-1 min-h-[34px]"
                        title="Edit Travel and Places"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Places</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectTrip(trip);
                          onGoToCheckIn();
                        }}
                        className="btn-primary px-2.5 py-1 text-xs flex items-center gap-1 min-h-[34px]"
                        title="Check-in passengers for this trip"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete travel "${trip.name}" (${trip.viajesNumber})?`)) {
                            onDeleteTrip(trip.id);
                          }
                        }}
                        className="btn-secondary p-1.5 text-[#868D95] hover:text-[#F23845] min-h-[34px]"
                        title="Delete travel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Passes & Boarding Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#D5D9E0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#D5D9E0] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0052F2]" />
                <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Recent Passes</h3>
              </div>
              <p className="text-xs text-[#697077] mt-0.5">
                Live issued boarding passes ({tickets.length} total)
              </p>
            </div>

            <button
              onClick={onGoToValidator}
              className="text-xs text-[#0052F2] hover:underline font-semibold flex items-center gap-1"
            >
              <span>Scanner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <QrCode className="w-8 h-8 text-[#B9BFC7] mx-auto" />
              <p className="text-xs font-semibold text-[#000000]">No passes generated</p>
              <p className="text-[11px] text-[#697077]">
                Use &quot;New Check-in&quot; to issue passenger boarding passes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#D5D9E0] max-h-[460px] overflow-y-auto">
              {tickets.slice(0, 10).map((ticket) => {
                const isChecked = ticket.status === 'checked_in';

                return (
                  <div
                    key={ticket.id}
                    className="p-3.5 hover:bg-[#F2F4F8] transition-colors flex items-center justify-between gap-2"
                  >
                    <div 
                      onClick={() => onViewTicket(ticket)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#EBF3FF] text-[#0052F2] border border-[#0052F2] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        #{ticket.seatNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-[#000000] truncate flex items-center gap-2">
                          <span>{ticket.firstName} {ticket.lastName}</span>
                          {ticket.stripeAccountUsed && (
                            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {ticket.stripeAccountUsed === 'account_1' ? 'Stripe 1' : 'Stripe 2'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#697077] truncate flex items-center gap-1.5 mt-0.5">
                          <span>{ticket.destination}</span>
                          <span>•</span>
                          <span className="font-mono">{ticket.id}</span>
                          {ticket.contactEmail && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px] text-[#50565B]">{ticket.contactEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {ticket.whatsappNumber && (
                        <a
                          href={generateWhatsAppPassUrl(ticket, trips.find(t => t.id === ticket.tripId))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                          title={`Send WhatsApp boarding pass to ${ticket.whatsappNumber}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <div onClick={() => onViewTicket(ticket)} className="cursor-pointer">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBF3FF] text-[#0052F2] font-semibold text-[9px] border border-[#0052F2]">
                            <Check className="w-2.5 h-2.5" /> Boarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4F8] text-[#50565B] font-semibold text-[9px] border border-[#D5D9E0]">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Team & Role Management Section */}
      <div className="bg-white border border-[#D5D9E0] rounded-2xl shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0052F2]" />
              <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Staff Team &amp; Permissions</h3>
            </div>
            <p className="text-xs text-[#697077] mt-0.5">
              Assign and modify permissions for drivers, ticketing agents, and travel creators
            </p>
          </div>
        </div>

        {teamUsers.length === 0 ? (
          <div className="p-4 bg-[#F2F4F8] rounded-xl text-xs text-[#697077] flex items-center justify-between">
            <span>Primary Administrator: <strong>houdayfaelaouni2006@gmail.com</strong> (Executive Admin)</span>
            <span className="text-[#0052F2] font-semibold">Active</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2F4F8] text-[#50565B] uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9E0]">
                {teamUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-[#F2F4F8]">
                    <td className="py-2.5 px-3 font-semibold text-[#000000]">
                      {user.displayName || 'Staff Member'}
                    </td>
                    <td className="py-2.5 px-3 text-[#50565B] font-mono text-[11px]">
                      {user.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-[#EBF3FF] text-[#0052F2] border border-[#0052F2]">
                        {ROLE_DEFINITIONS[user.role]?.title || user.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        className="bg-white border border-[#D5D9E0] text-xs rounded px-2 py-1 font-medium"
                      >
                        <option value="admin">Executive Admin</option>
                        <option value="driver">Driver (Check-in Scanner)</option>
                        <option value="ticketing_agent">Ticketing Agent (Pass Generator)</option>
                        <option value="travel_creator">Travel Coordinator (Creator)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
