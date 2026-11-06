import React from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { PublicPass } from '../../../shared/types';
import { useApi } from '../../lib/hooks';
import { formatDate, formatDateTime } from '../../lib/format';
import { Badge, ErrorBox, Spinner } from '../../components/ui';
import { QrImage } from '../../components/QrImage';
import { PublicShell } from './PublicShell';

/**
 * The boarding pass is the one bold surface in the product: deep green,
 * with the seat number in neon, readable at arm's length on a phone.
 */
export function PassPage({ code }: { code: string }) {
  const { data, error, loading } = useApi<PublicPass>(`/public/pass/${encodeURIComponent(code)}`);

  return (
    <PublicShell subtitle="Boarding pass">
      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div className="mx-auto max-w-sm overflow-hidden rounded-xl2 bg-brand text-paper">
          <div className="px-6 pb-5 pt-6">
            <div className="text-[13px] font-bold text-accent">{data.trip.code}</div>
            <h1 className="mt-1 text-2xl font-black leading-tight">{data.trip.name}</h1>
            <p className="mt-1 text-[15px] text-paper/80">{formatDate(data.trip.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-[13px] font-bold text-paper/70">Departs</div>
                <div className="text-4xl font-black leading-none">{data.trip.departureTime}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-paper/70">Seat</div>
                <div className="text-7xl font-black leading-[0.85] text-accent">{data.ticket.seat}</div>
              </div>
            </div>
          </div>

          {/* Tear line between stub and QR */}
          <div className="relative h-6">
            <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-paper" />
            <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-paper" />
            <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-paper/25" />
          </div>

          <div className="flex flex-col items-center px-6 pb-6 pt-2 text-center">
            <div className="text-lg font-extrabold">{data.ticket.passengerName}</div>
            <div className="mt-2">
              {data.ticket.status === 'cancelled' ? (
                <Badge tone="red">Cancelled, do not board</Badge>
              ) : data.ticket.status === 'checked_in' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Boarded {formatDateTime(data.ticket.checkedInAt)}
                </span>
              ) : !data.paid ? (
                <Badge tone="amber">Payment pending</Badge>
              ) : null}
            </div>
            {data.ticket.status !== 'cancelled' && (
              <div className="mt-4 rounded-lg bg-white p-3">
                <QrImage value={data.ticket.code} size={220} />
              </div>
            )}
            <p className="mt-4 text-[13px] text-paper/75">Show this code to the driver. Please arrive 10 minutes early.</p>
          </div>

          <a
            href={data.trip.meetingPointUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 border-t border-paper/15 bg-black/15 px-6 py-4 text-left text-sm"
          >
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>
              <span className="block font-bold">{data.trip.meetingPoint}</span>
              {data.trip.meetingPointUrl && <span className="text-paper/75 underline underline-offset-2">Open in Maps</span>}
            </span>
          </a>
        </div>
      )}
    </PublicShell>
  );
}
