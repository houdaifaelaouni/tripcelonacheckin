import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, ScanLine, Search, ShoppingCart } from 'lucide-react';
import type { ManifestRow, PublicStaff, Trip, TripSummary } from '../../../shared/types';
import { can } from '../../../shared/permissions';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { CHANNEL_LABEL, formatDate, formatEUR } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Badge, Button, ErrorBox, Input, PageHeader, Spinner, Stat } from '../../components/ui';
import { SeatMap } from '../../components/SeatMap';
import { BookingDetail, PaymentBadge } from '../../components/BookingDetail';
import { STATUS_TONE, TripForm } from './TripsPage';

export function TripDetailPage({ id, staff }: { id: string; staff: PublicStaff }) {
  const trip = useApi<TripSummary & { seatsTaken: number[] }>(`/trips/${id}`, 30_000);
  const manifest = useApi<{ trip: Trip; rows: ManifestRow[] }>(can(staff.role, 'manifest.view') ? `/trips/${id}/manifest` : null, 30_000);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'seats'>('list');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reloadAll = () => {
    trip.reload();
    manifest.reload();
  };
  const rows = useMemo(() => {
    const all = manifest.data?.rows ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => `${r.ticket.seat} ${r.ticket.passengerName} ${r.booking.payer.name} ${r.booking.externalRef ?? ''} ${r.booking.id}`.toLowerCase().includes(term));
  }, [manifest.data, q]);

  async function ticketAction(ticketId: string, kind: 'board' | 'undo' | 'move' | 'rename', current?: string | number) {
    setErr(null);
    let body: object = { tripId: id };
    let path = `/checkin/tickets/${ticketId}`;
    if (kind === 'undo') path += '/undo';
    if (kind === 'move') {
      const seat = prompt(`Move passenger from seat ${current} to seat:`);
      if (!seat) return;
      path = `/tickets/${ticketId}/move`;
      body = { seat: Number(seat) };
    }
    if (kind === 'rename') {
      const name = prompt('Passenger name:', String(current ?? ''));
      if (!name) return;
      path = `/tickets/${ticketId}`;
      body = { passengerName: name };
    }
    setBusy(ticketId);
    try {
      if (kind === 'rename') await api(path, { method: 'PATCH', body });
      else {
        const r = await api<{ outcome?: string; message?: string }>(path, { body });
        if (r.outcome === 'unpaid' && confirm(`${r.message}\n\nBoard anyway?`)) await api(path, { body: { ...body, force: true } });
        else if (r.outcome && r.outcome !== 'boarded') setErr(r.message ?? null);
      }
      reloadAll();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  if (trip.loading) return <Spinner />;
  if (trip.error || !trip.data) return <ErrorBox message={trip.error ?? 'Trip not found'} onRetry={trip.reload} />;
  const t = trip.data;
  const edit = can(staff.role, 'manifest.edit');
  const boardedSeats = Object.fromEntries((manifest.data?.rows ?? []).map((r) => [r.ticket.seat, r.ticket.status === 'checked_in' ? 'boarded' : 'booked'])) as Record<number, 'boarded' | 'booked'>;

  return (
    <div>
      <button onClick={() => navigate(staff.role === 'driver' ? '/app/scan' : '/app/trips')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader
        title={t.name}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t.code} · {formatDate(t.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {t.departureTime} · {t.meetingPoint}
            {t.status !== 'scheduled' && <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>}
          </span>
        }
        actions={
          <>
            {can(staff.role, 'checkin.scan') && (
              <Button variant="accent" onClick={() => navigate(`/app/scan?trip=${t.id}`)}>
                <ScanLine className="h-4 w-4" /> Board passengers
              </Button>
            )}
            {can(staff.role, 'bookings.create') && (
              <Button variant="secondary" onClick={() => navigate(`/app/sell?trip=${t.id}`)}>
                <ShoppingCart className="h-4 w-4" /> Sell seats
              </Button>
            )}
            {can(staff.role, 'trips.manage') && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sold" value={`${t.sold}/${t.capacity}`} sub={t.held ? `${t.held} held at checkout` : `${t.capacity - t.sold} free`} />
        <Stat label="Boarded" value={`${t.boarded}/${t.sold}`} />
        <Stat label="Online price" value={formatEUR(t.price)} sub={t.onlineSales ? 'On sale online' : 'Offline sales only'} />
        {staff.role !== 'driver' && <Stat label={staff.role === 'partner' ? 'Your revenue' : 'Revenue (paid)'} value={formatEUR(t.revenue)} />}
      </div>

      {manifest.data && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, seat, reference…" className="pl-9" />
            </div>
            <div className="inline-flex rounded-full border-[1.5px] border-line bg-white p-1">
              {(['list', 'seats'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${view === v ? 'bg-brand text-paper' : 'text-body hover:text-ink'}`}>
                  {v === 'list' ? 'Passengers' : 'Seat map'}
                </button>
              ))}
            </div>
          </div>
          {err && (
            <div className="mb-3">
              <ErrorBox message={err} />
            </div>
          )}

          {view === 'seats' ? (
            <SeatMap capacity={t.capacity} taken={t.seatsTaken} selected={[]} labels={boardedSeats} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line bg-paper text-left text-[13px] font-bold text-body">
                  <tr>
                    <th className="px-4 py-3">Seat</th>
                    <th className="px-4 py-3">Passenger</th>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Boarding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(({ ticket, booking }) => (
                    <tr key={ticket.id} className={ticket.status === 'checked_in' ? 'bg-mint/50' : ''}>
                      <td className="px-4 py-3 text-lg font-black text-ink">{ticket.seat}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-ink">{ticket.passengerName}</div>
                        {booking.payer.phone && <div className="text-xs text-muted">{booking.payer.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => staff.role !== 'driver' && setOpen(booking.id)} className="text-left">
                          <div className="text-ink">
                            {CHANNEL_LABEL[booking.channel]}
                            {booking.platform ? ` · ${booking.platform}` : ''}
                          </div>
                          <div className="text-xs text-muted">{booking.externalRef || booking.id}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge b={{ status: 'confirmed', payment: booking.payment }} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {can(staff.role, 'checkin.scan') &&
                            (ticket.status === 'checked_in' ? (
                              <Button variant="ghost" className="!px-2 !py-1 text-xs" loading={busy === ticket.id} onClick={() => ticketAction(ticket.id, 'undo')}>
                                ✓ Boarded · undo
                              </Button>
                            ) : (
                              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" loading={busy === ticket.id} onClick={() => ticketAction(ticket.id, 'board')}>
                                Board
                              </Button>
                            ))}
                          {!can(staff.role, 'checkin.scan') && (ticket.status === 'checked_in' ? <Badge tone="green">Boarded</Badge> : <Badge>Not yet</Badge>)}
                          {edit && (
                            <>
                              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => ticketAction(ticket.id, 'move', ticket.seat)}>
                                Move
                              </Button>
                              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => ticketAction(ticket.id, 'rename', ticket.passengerName)}>
                                Rename
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted">
                        {q ? 'No passenger matches your search.' : 'No passengers yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && (
        <TripForm
          trip={t}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reloadAll();
          }}
        />
      )}
      {open && <BookingDetail id={open} staff={staff} onClose={() => setOpen(null)} onChanged={reloadAll} />}
    </div>
  );
}
