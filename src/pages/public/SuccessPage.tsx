import React, { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react';
import type { PublicTrip } from '../../../shared/types';
import { api, errorText } from '../../lib/api';
import { formatDate, formatEUR } from '../../lib/format';
import { Button, Card, ErrorBox, Spinner } from '../../components/ui';
import { QrImage } from '../../components/QrImage';
import { PublicShell } from './PublicShell';

interface Result {
  booking: { id: string; status: string; seats: number[]; amount: number; payer: { name: string; email?: string }; notes?: string };
  trip: PublicTrip;
  tickets: { id: string; seat: number; passengerName: string; code: string; url: string }[];
  whatsappUrl: string | null;
}

export function SuccessPage({ search }: { search: URLSearchParams }) {
  const bookingId = search.get('booking');
  const sessionId = search.get('session_id');
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || !sessionId) {
      setError('This confirmation link is incomplete.');
      return;
    }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await api<Result>(`/public/bookings/${bookingId}?session_id=${encodeURIComponent(sessionId)}`);
        setData(r);
        // Payment may still be processing for a few seconds.
        if (!r.tickets.length && tries++ < 15) timer = setTimeout(load, 2000);
      } catch (e) {
        setError(errorText(e));
      }
    };
    load();
    return () => clearTimeout(timer);
  }, [bookingId, sessionId]);

  return (
    <PublicShell>
      {error && <ErrorBox message={error} />}
      {!error && !data && <Spinner label="Confirming your payment" />}
      {data && !data.tickets.length && (
        <Card className="text-center">
          <Spinner label="Payment received, issuing your tickets…" />
          <p className="text-sm text-muted">This usually takes a few seconds. You'll also get them by email.</p>
        </Card>
      )}
      {data && data.tickets.length > 0 && (
        <div>
          <div className="mb-6 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-moss" />
            <div>
              <h1 className="text-2xl font-bold text-ink">You're booked, {data.booking.payer.name.split(' ')[0]}!</h1>
              <p className="mt-1 text-sm text-muted">
                {data.trip.name} · {formatDate(data.trip.date, { weekday: 'long', day: 'numeric', month: 'long' })} · departure {data.trip.departureTime}
              </p>
              <p className="text-sm text-muted">
                Meeting point: {data.trip.meetingPoint}
                {data.trip.meetingPointUrl && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={data.trip.meetingPointUrl} target="_blank" rel="noreferrer" className="font-bold text-ink underline underline-offset-2">
                      Open map
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          {data.booking.notes && <div className="mb-4 rounded-lg bg-gold-soft px-4 py-3 text-sm font-medium text-[#5c3b00]">{data.booking.notes}</div>}

          <div className="mb-6 flex flex-wrap gap-2">
            {data.whatsappUrl && (
              <a href={data.whatsappUrl} target="_blank" rel="noreferrer">
                <Button variant="share">
                  <MessageCircle className="h-4 w-4" /> Save to WhatsApp
                </Button>
              </a>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              Print tickets
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {data.tickets.map((t) => (
              <Card key={t.id} className="flex flex-col items-center text-center">
                <QrImage value={t.code} size={200} />
                <div className="mt-3 text-sm text-muted">Seat</div>
                <div className="text-3xl font-bold text-ink">{t.seat}</div>
                <div className="mt-1 font-medium text-ink">{t.passengerName}</div>
                <a href={t.url} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ink underline underline-offset-2">
                  Open pass <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Paid {formatEUR(data.booking.amount)} · Booking {data.booking.id}
            {data.booking.payer.email && ` · Tickets emailed to ${data.booking.payer.email}`}
          </p>
        </div>
      )}
    </PublicShell>
  );
}
