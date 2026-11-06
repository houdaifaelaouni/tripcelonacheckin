import React, { useState } from 'react';
import { 
  ScanLine, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Search, 
  Download, 
  Printer, 
  Check, 
  Copy, 
  Clock, 
  Eye, 
  Trash2
} from 'lucide-react';
import { TravelTrip, Ticket, ValidationScanResult, MAX_SEATS_PER_TRAVEL } from '../types';
import { QRScanner } from './QRScanner';
import { sounds } from '../utils/audio';
import { toggleCheckInStatus, deleteTicket } from '../utils/storage';
import { triggerPrintManifest } from '../utils/printPass';

interface ValidationPortalProps {
  activeTrip: TravelTrip;
  trips: TravelTrip[];
  onSelectTrip: (trip: TravelTrip) => void;
  tickets: Ticket[];
  onScanResult: (result: ValidationScanResult) => void;
  lastResult: ValidationScanResult | null;
  onClearResult: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

export const ValidationPortal: React.FC<ValidationPortalProps> = ({
  activeTrip,
  trips,
  onSelectTrip,
  tickets,
  onScanResult,
  lastResult,
  onClearResult,
  onViewTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const separateValidatorUrl = `${window.location.origin}${window.location.pathname}?mode=validator`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(separateValidatorUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const filteredTickets = tickets
    .filter(ticket => {
      const matchesTrip = ticket.tripId === activeTrip.id;
      if (!matchesTrip) return false;

      const query = searchTerm.toLowerCase();
      const fullName = `${ticket.firstName} ${ticket.lastName}`.toLowerCase();
      const matchesSearch = 
        fullName.includes(query) ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.destination.toLowerCase().includes(query) ||
        String(ticket.seatNumber).includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === 'checked_in') return ticket.status === 'checked_in';
      if (statusFilter === 'pending') return ticket.status !== 'checked_in';

      return true;
    })
  const tripCapacity = activeTrip ? (activeTrip.capacity || 55) : 55;
  const tripTickets = activeTrip 
    ? tickets.filter(t => t.tripId === activeTrip.id && t.status !== 'cancelled')
    : [];
  const totalBooked = tripTickets.length;
  const totalCheckedIn = tripTickets.filter(t => t.status === 'checked_in').length;
  const totalPending = totalBooked - totalCheckedIn;
  const emptyPlaces = Math.max(0, tripCapacity - totalBooked);

  const handleToggleCheckIn = async (ticketId: string) => {
    const updated = await toggleCheckInStatus(ticketId);
    if (updated) {
      if (updated.status === 'checked_in') {
        sounds.playSuccess();
      } else {
        sounds.playWarning();
      }
    }
  };

  const handleDelete = async (ticketId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove reservation for ${name} (${ticketId})? This frees up Seat #${ticketId.split('-').pop()}.`)) {
      await deleteTicket(ticketId);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'Seat Number', 'First Name', 'Surname', 'Destination', 'Status', 'Check-in Time'];
    const rows = tripTickets
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .map(t => [
        t.id,
        t.seatNumber,
        `"${t.firstName}"`,
        `"${t.lastName}"`,
        `"${t.destination}"`,
        t.status === 'checked_in' ? 'Checked In' : 'Pending',
        t.checkedInAt ? new Date(t.checkedInAt).toLocaleString() : 'N/A'
      ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tripcelona-Manifest-${activeTrip.viajesNumber}-${activeTrip.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintManifest = () => {
    triggerPrintManifest(activeTrip, tripTickets);
  };

  return (
    <div className="w-full max-w-[100%] sm:max-w-6xl mx-auto space-y-4 sm:space-y-6 font-gellix">
      {/* Top Banner: Separate Link for Staff / Driver */}
      <div className="w-full bg-[#13171A] text-white border border-[#242A2E] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0052F2] flex items-center justify-center text-white shrink-0">
            <ScanLine className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-white">Conductor Scanner Terminal</h2>
              <span className="text-xs font-mono text-[#4083FF]">
                Live Optical Engine
              </span>
            </div>
            <p className="text-xs text-[#9FA5AD] mt-0.5">
              Rapid barcode &amp; QR verification with acoustic feedback and anti-duplicate boarding guard
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="btn-primary w-full md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs min-h-[42px]"
            title="Copies the direct validation link to share with staff"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy Validator Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Live Scanner & Active Scan Result */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column: QR Camera Scanner */}
        <div className="w-full lg:col-span-7">
          <QRScanner
            onScan={(code) => {
              const res = onScanResult as unknown as (c: string) => void;
              res(code);
            }}
            sampleTickets={tripTickets}
          />
        </div>

        {/* Right Column: Scan Verification Banner & Travel Selector */}
        <div className="w-full lg:col-span-5 space-y-3 sm:space-y-4">
          {/* Active Travel Selector */}
          <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-3.5 sm:p-4 shadow-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#697077] mb-1.5">
              Validating For Travel / Viaje
            </label>
            <select
              value={activeTrip.id}
              onChange={(e) => {
                const found = trips.find(t => t.id === e.target.value);
                if (found) onSelectTrip(found);
              }}
              className="w-full bg-white border border-[#D5D9E0] text-[#000000] text-xs rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0052F2] font-semibold"
            >
              {trips.map(t => (
                <option key={t.id} value={t.id}>
                  {t.viajesNumber} • {t.name} ({t.date})
                </option>
              ))}
            </select>
          </div>

          {/* Last Scan Result Card */}
          {lastResult ? (
            <div className={`w-full p-4 sm:p-5 rounded-xl border shadow-xs transition-all animate-fade-in ${
              lastResult.statusType === 'success'
                ? 'bg-white border-[#0052F2]'
                : lastResult.statusType === 'already_checked_in'
                ? 'bg-[#F2F4F8] border-[#9FA5AD]'
                : 'bg-[#FFF2F2] border-[#FFCCD0]'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {lastResult.statusType === 'success' ? (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#EBF3FF] border border-[#0052F2] flex items-center justify-center text-[#0052F2] shrink-0">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  ) : lastResult.statusType === 'already_checked_in' ? (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#F2F4F8] border border-[#B9BFC7] flex items-center justify-center text-[#50565B] shrink-0">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#FFF2F2] border border-[#FFCCD0] flex items-center justify-center text-[#F23845] shrink-0">
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-[#000000]">
                      {lastResult.statusType === 'success'
                        ? 'PASSENGER VERIFIED'
                        : lastResult.statusType === 'already_checked_in'
                        ? 'ALREADY CHECKED IN'
                        : 'INVALID TICKET'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#697077]">
                      {new Date(lastResult.scannedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClearResult}
                  className="text-xs text-[#0052F2] hover:underline p-1"
                >
                  Dismiss
                </button>
              </div>

              {/* Message */}
              <p className="mt-2.5 sm:mt-3 text-xs leading-relaxed text-[#373D42] font-medium">
                {lastResult.message}
              </p>

              {/* Passenger Card Details if available */}
              {lastResult.ticket && (
                <div className="w-full mt-3 p-3 bg-[#F2F4F8] rounded-lg border border-[#D5D9E0] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#697077]">Passenger:</span>
                    <span className="font-semibold text-[#000000]">
                      {lastResult.ticket.firstName} {lastResult.ticket.lastName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#697077]">Assigned Seat:</span>
                    <span className="font-mono font-bold text-[#0052F2]">
                      Seat #{lastResult.ticket.seatNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#697077]">Destination:</span>
                    <span className="font-medium text-[#000000] truncate max-w-[150px]">
                      {lastResult.ticket.destination}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#D5D9E0]">
                    <span className="text-[#697077]">Ticket ID:</span>
                    <span className="font-mono text-[#000000] font-semibold text-[11px]">
                      {lastResult.ticket.id}
                    </span>
                  </div>

                  <div className="pt-1.5">
                    <button
                      onClick={() => onViewTicket(lastResult.ticket!)}
                      className="btn-secondary w-full py-2 text-xs font-medium flex items-center justify-center gap-1.5 min-h-[38px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Digital Pass
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-5 sm:p-6 text-center text-[#697077] space-y-1.5 shadow-xs">
              <ScanLine className="w-7 h-7 sm:w-8 sm:h-8 text-[#9FA5AD] mx-auto" />
              <p className="text-xs font-semibold text-[#000000]">Scanner Ready</p>
              <p className="text-[11px] text-[#697077]">
                Point camera at Tripcelona pass QR or enter Ticket ID above.
              </p>
            </div>
          )}

          {/* Quick Stats Grid: Fluid 50% each */}
          <div className="w-full grid grid-cols-2 gap-2">
            <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-3 shadow-xs">
              <div className="text-[10px] text-[#697077] uppercase font-semibold">Total Places</div>
              <div className="text-base sm:text-lg font-bold text-[#000000] mt-0.5">{tripCapacity} Max</div>
              <div className="text-[10px] text-[#697077]">{emptyPlaces} free</div>
            </div>

            <div className="w-full bg-white border border-[#D5D9E0] rounded-xl p-3 shadow-xs">
              <div className="text-[10px] text-[#0052F2] uppercase font-semibold">Checked In</div>
              <div className="text-base sm:text-lg font-bold text-[#0052F2] mt-0.5">
                {totalCheckedIn} <span className="text-xs font-normal text-[#697077]">/ {totalBooked}</span>
              </div>
              <div className="text-[10px] text-[#50565B]">{totalPending} pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger Manifest Section */}
      <div className="w-full bg-white border border-[#D5D9E0] rounded-xl shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="w-full p-4 sm:p-5 border-b border-[#D5D9E0] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0052F2]" />
              <h3 className="font-semibold text-sm sm:text-base text-[#000000]">Passenger Manifest ({activeTrip?.viajesNumber || 'All'})</h3>
            </div>
            <p className="text-xs text-[#697077] mt-0.5">
              Live roster: {tripTickets.length} of {tripCapacity} places booked
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2">
            {/* Filter Tabs */}
            <div className="flex bg-[#F2F4F8] p-1 rounded-lg text-xs font-medium border border-[#D5D9E0] w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-[#000000] shadow-2xs font-semibold' : 'text-[#697077] hover:text-[#000000]'
                }`}
              >
                All ({tripTickets.length})
              </button>
              <button
                onClick={() => setStatusFilter('checked_in')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'checked_in' ? 'bg-[#0052F2] text-white shadow-2xs font-semibold' : 'text-[#697077] hover:text-[#000000]'
                }`}
              >
                Boarded ({totalCheckedIn})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 sm:px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'pending' ? 'bg-[#373D42] text-white shadow-2xs font-semibold' : 'text-[#697077] hover:text-[#000000]'
                }`}
              >
                Pending ({totalPending})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium min-h-[38px] sm:min-h-[auto]"
                title="Download CSV manifest"
              >
                <Download className="w-3.5 h-3.5 text-[#50565B]" />
                <span>CSV</span>
              </button>

              <button
                onClick={handlePrintManifest}
                className="btn-secondary flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium min-h-[38px] sm:min-h-[auto]"
                title="Print conductor manifest"
              >
                <Printer className="w-3.5 h-3.5 text-[#50565B]" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search input bar */}
        <div className="w-full p-3 sm:p-4 bg-[#F2F4F8] border-b border-[#D5D9E0]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-[#868D95] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search passenger name, seat #, or ticket code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#D5D9E0] rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-xs text-[#000000] placeholder-[#868D95] focus:outline-none focus:ring-2 focus:ring-[#0052F2]"
            />
          </div>
        </div>

        {/* MOBILE CARDS VIEW (Clean touch-friendly cards on phones < md) */}
        <div className="block md:hidden divide-y divide-[#D5D9E0]">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#868D95]">
              No passengers match your search criteria.
            </div>
          ) : (
            filteredTickets
              .sort((a, b) => a.seatNumber - b.seatNumber)
              .map(ticket => {
                const isChecked = ticket.status === 'checked_in';

                return (
                  <div key={ticket.id} className="p-3.5 sm:p-4 hover:bg-[#F2F4F8] transition-colors space-y-2.5">
                    <div className="w-full flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#EBF3FF] text-[#0052F2] border border-[#0052F2] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          #{ticket.seatNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-[#000000]">
                            {ticket.firstName} {ticket.lastName}
                          </div>
                          <div className="text-[11px] text-[#697077]">
                            {ticket.destination} • <span className="font-mono">{ticket.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold text-[10px] tracking-wide bg-[#00D668]/15 text-[#008A43] border border-[#00D668]/30">
                            <Check className="w-2.5 h-2.5" /> BOARDED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold text-[10px] tracking-wide bg-[#F2F4F8] text-[#50565B] border border-[#D5D9E0]">
                            <Clock className="w-2.5 h-2.5" /> PENDING
                          </span>
                        )}
                        <div className="text-[9px] text-[#868D95] font-mono mt-0.5">
                          {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleCheckIn(ticket.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors min-h-[40px] flex items-center justify-center ${
                          isChecked
                            ? 'btn-secondary text-[#50565B]'
                            : 'btn-primary'
                        }`}
                      >
                        {isChecked ? 'Undo Check-in' : '✓ Check In Passenger'}
                      </button>

                      <button
                        onClick={() => onViewTicket(ticket)}
                        className="btn-secondary p-2 rounded-lg text-[#697077] hover:text-[#0052F2] min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="View Pass"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(ticket.id, `${ticket.firstName} ${ticket.lastName}`)}
                        className="btn-secondary p-2 rounded-lg text-[#868D95] hover:text-[#F23845] min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (Visible md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F2F4F8] text-[#50565B] uppercase font-semibold text-[10px] tracking-wider border-b border-[#D5D9E0]">
              <tr>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Passenger Name &amp; Surname</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Check-in Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5D9E0] text-[#1E2024]">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#868D95]">
                    No passengers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map(ticket => {
                    const isChecked = ticket.status === 'checked_in';

                    return (
                      <tr key={ticket.id} className="hover:bg-[#F2F4F8] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0052F2]">
                          #{ticket.seatNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#000000]">
                          {ticket.firstName} {ticket.lastName}
                        </td>
                        <td className="py-3 px-4 text-[#50565B]">
                          {ticket.destination}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#697077]">
                          {ticket.id}
                        </td>
                        <td className="py-3 px-4">
                          {isChecked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-semibold text-[10px] tracking-wide bg-[#00D668]/15 text-[#008A43] border border-[#00D668]/30">
                              <Check className="w-3 h-3" /> BOARDED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-semibold text-[10px] tracking-wide bg-[#F2F4F8] text-[#50565B] border border-[#D5D9E0]">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#697077] text-[11px]">
                          {ticket.checkedInAt
                            ? new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleToggleCheckIn(ticket.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              isChecked
                                ? 'btn-secondary text-[#50565B]'
                                : 'btn-primary'
                            }`}
                          >
                            {isChecked ? 'Undo' : 'Check In'}
                          </button>
                          <button
                            onClick={() => onViewTicket(ticket)}
                            className="p-1 text-[#697077] hover:text-[#0052F2] rounded transition-colors inline-block"
                            title="View digital pass"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ticket.id, `${ticket.firstName} ${ticket.lastName}`)}
                            className="p-1 text-[#868D95] hover:text-[#F23845] rounded transition-colors inline-block"
                            title="Delete reservation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
