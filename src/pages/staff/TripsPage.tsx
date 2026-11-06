import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { PublicStaff, Trip, TripSummary } from '../../../shared/types';
import { can } from '../../../shared/permissions';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { formatDate, formatEUR, todayIso } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Badge, Button, Empty, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';

export const STATUS_TONE = { scheduled: 'blue', boarding: 'amber', departed: 'gray', completed: 'green', cancelled: 'red' } as const;

export function TripsPage({ staff }: { staff: PublicStaff }) {
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const { data, error, loading, reload } = useApi<TripSummary[]>(`/trips?scope=${scope}`);
  const [editing, setEditing] = useState<Partial<Trip> | null>(null);
  const manage = can(staff.role, 'trips.manage');

  return (
    <div>
      <PageHeader
        title="Trips"
        sub={staff.role === 'partner' ? 'Revenue shown is for your business only.' : undefined}
        actions={
          manage && (
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> New trip
            </Button>
          )
        }
      />
      <div className="mb-4 inline-flex rounded-full border-[1.5px] border-line bg-white p-1">
        {(['upcoming', 'past'] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${scope === s ? 'bg-brand text-paper' : 'text-body hover:text-ink'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !data.length && <Empty title={scope === 'upcoming' ? 'No upcoming trips' : 'No past trips'}>{manage && scope === 'upcoming' && 'Create the first departure with “New trip”.'}</Empty>}
      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          {data.map((t) => {
            const pct = Math.round((t.sold / t.capacity) * 100);
            return (
              <button key={t.id} onClick={() => navigate(`/app/trips/${t.id}`)} className="flex w-full flex-wrap items-center gap-4 border-b border-line px-4 py-4 text-left last:border-0 hover:bg-paper">
                <div className="w-20 shrink-0">
                  <div className="text-sm font-bold text-ink">{formatDate(t.date, { day: 'numeric', month: 'short' })}</div>
                  <div className="text-xs text-muted">
                    {formatDate(t.date, { weekday: 'short' })} · {t.departureTime}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-extrabold text-ink">{t.name}</span>
                    {t.status !== 'scheduled' && <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>}
                    {!t.onlineSales && t.status === 'scheduled' && <Badge>offline only</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {t.code} · {t.meetingPoint}
                  </div>
                </div>
                <div className="w-40">
                  <div className="flex justify-between text-xs text-muted">
                    <span>
                      {t.sold}/{t.capacity} sold{t.held ? ` · ${t.held} held` : ''}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-paper">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                {staff.role !== 'seller' && <div className="w-24 text-right text-sm font-extrabold text-ink">{formatEUR(t.revenue)}</div>}
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <TripForm
          trip={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setEditing(null);
            navigate(`/app/trips/${t.id}`);
          }}
        />
      )}
    </div>
  );
}

export function TripForm({ trip, onClose, onSaved }: { trip: Partial<Trip>; onClose: () => void; onSaved: (t: Trip) => void }) {
  const isNew = !trip.id;
  const [f, setF] = useState({
    name: trip.name ?? '',
    destination: trip.destination ?? '',
    date: trip.date ?? todayIso(),
    departureTime: trip.departureTime ?? '08:00',
    meetingPoint: trip.meetingPoint ?? '',
    meetingPointUrl: trip.meetingPointUrl ?? '',
    capacity: String(trip.capacity ?? 55),
    price: String(trip.price ?? ''),
    onlineSales: trip.onlineSales ?? true,
    status: trip.status ?? 'scheduled',
    driverIds: trip.driverIds ?? [],
    notes: trip.notes ?? '',
  });
  const drivers = useApi<PublicStaff[]>('/staff').data?.filter((s) => s.role === 'driver' && s.active) ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = { ...f, capacity: Number(f.capacity), price: Number(f.price) };
      const saved = isNew ? await api<Trip>('/trips', { body }) : await api<Trip>(`/trips/${trip.id}`, { method: 'PATCH', body });
      onSaved(saved);
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={isNew ? 'New trip' : 'Edit trip'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Trip name">
          <Input required value={f.name} onChange={set('name')} placeholder="Montserrat & Cava" />
        </Field>
        <Field label="Destination">
          <Input value={f.destination} onChange={set('destination')} placeholder="Montserrat" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input required type="date" value={f.date} onChange={set('date')} />
          </Field>
          <Field label="Departure">
            <Input required type="time" value={f.departureTime} onChange={set('departureTime')} />
          </Field>
        </div>
        <Field label="Meeting point">
          <Input required value={f.meetingPoint} onChange={set('meetingPoint')} placeholder="Plaça de Catalunya, in front of El Corte Inglés" />
        </Field>
        <Field label="Google Maps link (optional)">
          <Input type="url" value={f.meetingPointUrl} onChange={set('meetingPointUrl')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seats on the coach">
            <Input required type="number" min={1} max={120} value={f.capacity} onChange={set('capacity')} />
          </Field>
          <Field label="Online price (€)">
            <Input required type="number" min={0} step="0.01" value={f.price} onChange={set('price')} />
          </Field>
        </div>
        {!isNew && (
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              {['scheduled', 'boarding', 'departed', 'completed', 'cancelled'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Driver" hint="Only the assigned driver can see this trip and board passengers.">
          <Select value={f.driverIds[0] ?? ''} onChange={(e) => setF({ ...f, driverIds: e.target.value ? [e.target.value] : [] })}>
            <option value="">Not assigned yet</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.onlineSales} onChange={(e) => setF({ ...f, onlineSales: e.target.checked })} className="h-4 w-4 accent-[#0052F2]" />
          Sell online through the booking links
        </label>
        <Field label="Internal notes (optional)">
          <textarea value={f.notes} onChange={set('notes')} rows={2} className="w-full rounded-[20px] border-[1.5px] border-line px-5 py-3 text-base outline-none hover:border-line-strong focus:border-ink" />
        </Field>
        {err && <ErrorBox message={err} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {isNew ? 'Create trip' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
