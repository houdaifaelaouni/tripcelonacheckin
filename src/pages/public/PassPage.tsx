import React from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { PublicPass } from '../../../shared/types';
import { useApi } from '../../lib/hooks';
import { formatDate, formatDateTime } from '../../lib/format';
import { Badge, ErrorBox, Spinner } from '../../components/ui';
import { QrImage } from '../../components/QrImage';
import { PublicShell } from './PublicShell';

export function PassPage({ code }: { code: string }) {
  const { data, error, loading } = useApi<PublicPass>(`/public/pass/${encodeURIComponent(code)}`);

  return (
    <PublicShell subtitle="Boarding pass">
      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div className="mx-auto max-w-sm overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="bg-brand px-6 py-5 text-white">
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">{data.trip.code}</div>
            <div className="text-xl font-bold">{data.trip.name}</div>
            <div className="mt-1 text-sm opacity-90">
              {formatDate(data.trip.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {data.trip.departureTime}
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-6 text-center">
            {data.ticket.status === 'cancelled' ? (
              <Badge tone="red">Cancelled</Badge>
            ) : data.ticket.status === 'checked_in' ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Boarded {formatDateTime(data.ticket.checkedInAt)}
              </span>
            ) : !data.paid ? (
              <Badge tone="amber">Payment pending</Badge>
            ) : (
              <Badge tone="green">Valid</Badge>
            )}
            {data.ticket.status !== 'cancelled' && (
              <div className="mt-4">
                <QrImage value={data.ticket.code} size={240} />
              </div>
            )}
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-left">
              <div>
                <div className="text-xs text-muted">Passenger</div>
                <div className="font-semibold text-ink">{data.ticket.passengerName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">Seat</div>
                <div className="text-2xl font-bold text-ink">{data.ticket.seat}</div>
              </div>
            </div>
            <div className="mt-4 flex w-full items-start gap-2 rounded-xl bg-paper p-3 text-left text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <div>
                <div className="font-medium text-ink">{data.trip.meetingPoint}</div>
                {data.trip.meetingPointUrl && (
                  <a href={data.trip.meetingPointUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-muted">Show this QR code to the driver. Please arrive 10 minutes before departure.</p>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
