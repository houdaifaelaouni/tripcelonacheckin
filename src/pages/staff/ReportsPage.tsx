import React, { useState } from 'react';
import type { Partner, PublicStaff } from '../../../shared/types';
import type { Report } from '../../../shared/report';
import { can } from '../../../shared/permissions';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { CHANNEL_LABEL, METHOD_LABEL, formatEUR, todayIso } from '../../lib/format';
import { Button, Card, ErrorBox, Field, Input, PageHeader, Spinner, Stat } from '../../components/ui';

export function ReportsPage({ staff }: { staff: PublicStaff }) {
  const monthStart = todayIso().slice(0, 8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayIso());
  const { data, error, loading, reload } = useApi<Report & { from: string }>(`/reports?from=${from}&to=${to}`);
  const partners = useApi<Partner[]>('/partners').data ?? [];
  const team = useApi<PublicStaff[]>(staff.role === 'owner' || staff.role === 'coordinator' ? '/staff' : null).data ?? [];
  const [settling, setSettling] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? id;
  const staffName = (id: string) => (id === staff.id ? staff.name : team.find((s) => s.id === id)?.name ?? id);

  async function settle(sellerId: string, owed: number) {
    if (!confirm(`Mark ${formatEUR(owed)} commission for ${staffName(sellerId)} as paid out? This covers all their outstanding paid sales, not only this period.`)) return;
    setSettling(sellerId);
    setErr(null);
    try {
      await api('/reports/commissions/settle', { body: { sellerId } });
      reload();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setSettling(null);
    }
  }

  const sellerView = staff.role === 'seller';

  return (
    <div>
      <PageHeader
        title={sellerView ? 'My commission' : 'Reports'}
        sub={staff.role === 'partner' ? 'Revenue for your business only.' : 'Paid bookings, by booking date.'}
        actions={
          <div className="flex items-end gap-2">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        }
      />
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {err && <ErrorBox message={err} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={sellerView ? 'Your paid sales' : 'Revenue'} value={formatEUR(data.totals.revenue)} sub={`${data.totals.bookings} bookings`} />
            <Stat label="Seats" value={data.totals.seats} />
            <Stat label="Unpaid" value={formatEUR(data.totals.unpaidAmount)} sub={`${data.totals.unpaidBookings} bookings to chase`} />
            {sellerView ? (
              <Stat label="Commission owed" value={formatEUR(data.bySeller[0]?.commissionOwed ?? 0)} sub={`${formatEUR(data.bySeller[0]?.commissionSettled ?? 0)} already paid`} />
            ) : (
              <Stat label="Refunded" value={formatEUR(data.totals.refunded)} />
            )}
          </div>

          {!sellerView && (
            <div className="grid gap-4 md:grid-cols-3">
              <Breakdown title="By partner" rows={data.byPartner.map((b) => ({ ...b, label: partnerName(b.key) }))} />
              <Breakdown title="By channel" rows={data.byChannel.map((b) => ({ ...b, label: CHANNEL_LABEL[b.key as keyof typeof CHANNEL_LABEL] ?? b.key }))} />
              <Breakdown title="By payment" rows={data.byMethod.map((b) => ({ ...b, label: METHOD_LABEL[b.key as keyof typeof METHOD_LABEL] ?? b.key }))} />
            </div>
          )}

          {!sellerView && data.bySeller.length > 0 && (
            <Card>
              <div className="mb-3 font-extrabold text-ink">Sellers & commission</div>
              <div className="divide-y divide-line">
                {data.bySeller.map((s) => (
                  <div key={s.key} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink">{staffName(s.key)}</div>
                      <div className="text-xs text-muted">
                        {s.bookings} sales · {s.seats} seats · {formatEUR(s.revenue)}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-extrabold text-ink">{formatEUR(s.commissionOwed)} owed</div>
                      <div className="text-xs text-muted">{formatEUR(s.commissionSettled)} paid out</div>
                    </div>
                    {can(staff.role, 'commissions.settle') && s.commissionOwed > 0 && (
                      <Button variant="secondary" loading={settling === s.key} onClick={() => settle(s.key, s.commissionOwed)}>
                        Mark paid out
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; revenue: number; seats: number }[] }) {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <Card>
      <div className="mb-3 font-extrabold text-ink">{title}</div>
      {!rows.length && <div className="text-sm text-muted">No paid bookings.</div>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm">
              <span className="text-ink">{r.label}</span>
              <span className="font-extrabold text-ink">{formatEUR(r.revenue)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-paper">
              <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(r.revenue / max) * 100}%` }} />
            </div>
            <div className="mt-0.5 text-xs text-muted">{r.seats} seats</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
