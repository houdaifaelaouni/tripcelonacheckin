import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Booking, PublicStaff } from '../../../shared/types';
import { useApi } from '../../lib/hooks';
import { CHANNEL_LABEL, formatDateTime, formatEUR } from '../../lib/format';
import { Empty, ErrorBox, Input, PageHeader, Select, Spinner } from '../../components/ui';
import { BookingDetail, PaymentBadge } from '../../components/BookingDetail';

export function BookingsPage({ staff }: { staff: PublicStaff }) {
  const { data, error, loading, reload } = useApi<Booking[]>('/bookings');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'online' | 'cancelled'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((b) => {
      if (filter === 'unpaid' && !(b.status === 'confirmed' && b.payment.status === 'unpaid')) return false;
      if (filter === 'online' && b.channel !== 'online') return false;
      if (filter === 'cancelled' && b.status !== 'cancelled') return false;
      if (filter === 'all' && b.status === 'cancelled') return false;
      return !term || `${b.id} ${b.payer.name} ${b.payer.email ?? ''} ${b.payer.phone ?? ''} ${b.externalRef ?? ''}`.toLowerCase().includes(term);
    });
  }, [data, q, filter]);

  return (
    <div>
      <PageHeader
        title={staff.role === 'seller' ? 'My sales' : 'Bookings'}
        sub={staff.role === 'partner' ? 'Bookings whose revenue belongs to your business.' : staff.role === 'seller' ? 'Everything you sold. Chase unpaid Stripe links from here.' : 'Last 30 days.'}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, reference…" className="pl-9" />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="!w-auto">
          <option value="all">Active</option>
          <option value="unpaid">Unpaid</option>
          <option value="online">Online</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !rows.length && <Empty title="No bookings found" />}
      {rows.length > 0 && (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {rows.map((b) => (
            <button key={b.id} onClick={() => setOpen(b.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-paper">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-ink">{b.payer.name}</div>
                <div className="truncate text-xs text-muted">
                  {CHANNEL_LABEL[b.channel]}
                  {b.platform ? ` · ${b.platform}` : ''} · {b.seats.length} seat{b.seats.length > 1 ? 's' : ''} · {formatDateTime(b.createdAt)} · {b.externalRef || b.id}
                </div>
              </div>
              <PaymentBadge b={b} />
              <div className="w-20 text-right font-extrabold text-ink">{formatEUR(b.amount)}</div>
            </button>
          ))}
        </div>
      )}
      {open && <BookingDetail id={open} staff={staff} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}
