import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, List, ArrowLeft } from 'lucide-react';
import type { PublicStaff, ScanResult, TripSummary } from '../../../shared/types';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { formatDate, todayIso } from '../../lib/format';
import { navigate } from '../../lib/router';
import { sounds } from '../../lib/sounds';
import { Button, Card, Empty, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import { QRScanner } from '../../components/QRScanner';

export function ScanPage({ staff, search }: { staff: PublicStaff; search: URLSearchParams }) {
  const trips = useApi<TripSummary[]>('/trips?scope=upcoming');
  const [tripId, setTripId] = useState<string | null>(search.get('trip'));

  // Drivers with a single trip today go straight to scanning.
  useEffect(() => {
    if (tripId || !trips.data) return;
    const today = trips.data.filter((t) => t.date === todayIso() && t.status !== 'cancelled');
    if (today.length === 1) setTripId(today[0].id);
  }, [trips.data, tripId]);

  if (trips.loading) return <Spinner />;
  if (trips.error) return <ErrorBox message={trips.error} onRetry={trips.reload} />;

  const trip = trips.data?.find((t) => t.id === tripId);
  if (!trip) {
    const list = (trips.data ?? []).filter((t) => t.status !== 'cancelled' && t.status !== 'completed');
    return (
      <div>
        <PageHeader title="Board passengers" sub="Choose the coach you're boarding." />
        {!list.length && <Empty title="No trips assigned to you">{staff.role === 'driver' ? 'Ask the coordinator to assign you to a trip.' : 'Create a trip first.'}</Empty>}
        <div className="grid gap-3">
          {list.slice(0, 20).map((t) => (
            <button key={t.id} onClick={() => setTripId(t.id)} className="text-left">
              <Card className="transition-colors hover:border-ink">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-ink">{t.name}</div>
                    <div className="text-sm text-muted">
                      {t.date === todayIso() ? 'Today' : formatDate(t.date)} · {t.departureTime} · {t.meetingPoint}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted">
                    {t.boarded}/{t.sold} boarded
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <Scanner trip={trip} onBack={() => setTripId(null)} />;
}

function Scanner({ trip, onBack }: { trip: TripSummary; onBack: () => void }) {
  const live = useApi<TripSummary>(`/trips/${trip.id}`, 15_000);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = live.data ?? trip;

  async function scan(code: string, force = false) {
    setBusy(true);
    setErr(null);
    setLastCode(code);
    try {
      const r = await api<ScanResult>('/checkin/scan', { body: { tripId: trip.id, code, force } });
      setResult(r);
      if (r.outcome === 'boarded') sounds.ok();
      else if (r.outcome === 'already_boarded' || r.outcome === 'unpaid') sounds.warn();
      else sounds.error();
      if (r.outcome === 'boarded') live.reload();
    } catch (e) {
      setErr(errorText(e));
      sounds.error();
    } finally {
      setBusy(false);
    }
  }

  // Successful scans clear automatically so the driver can keep going.
  useEffect(() => {
    if (result?.outcome !== 'boarded') return;
    const id = setTimeout(() => setResult(null), 2200);
    return () => clearTimeout(id);
  }, [result]);

  const tone =
    result?.outcome === 'boarded'
      ? { bg: 'bg-accent text-ink', Icon: CheckCircle2, title: 'Board' }
      : result?.outcome === 'already_boarded' || result?.outcome === 'unpaid'
        ? { bg: 'bg-gold text-ink', Icon: AlertTriangle, title: result.outcome === 'unpaid' ? 'Not paid' : 'Already boarded' }
        : { bg: 'bg-stop text-white', Icon: XCircle, title: 'Do not board' };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
          <ArrowLeft className="h-4 w-4" /> Trips
        </button>
        <Button variant="secondary" className="!py-1.5" onClick={() => navigate(`/app/trips/${trip.id}`)}>
          <List className="h-4 w-4" /> Passenger list
        </Button>
      </div>
      <div className="mb-3">
        <div className="text-xl font-black text-ink">{t.name}</div>
        <div className="text-sm text-muted">
          {t.date === todayIso() ? 'Today' : formatDate(t.date)} · {t.departureTime}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-brand p-3 text-center text-paper">
          <div className="text-4xl font-black text-accent">{t.boarded}</div>
          <div className="text-[13px] font-bold text-paper/80">boarded</div>
        </div>
        <div className="rounded-lg border border-line bg-white p-3 text-center">
          <div className="text-4xl font-black text-ink">{Math.max(t.sold - t.boarded, 0)}</div>
          <div className="text-[13px] font-bold text-body">still to board</div>
        </div>
      </div>

      <div className="relative">
        <QRScanner onScan={(c) => !busy && !result && scan(c)} paused={!!result || busy} />
        {result && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl2 p-6 text-center ${tone.bg}`}>
            <tone.Icon className="h-14 w-14" />
            <div className="mt-2 text-2xl font-black">{tone.title}</div>
            {result.ticket && (
              <div className="mt-2">
                <div className="text-6xl font-black leading-none">Seat {result.ticket.seat}</div>
                <div className="mt-1 text-lg font-extrabold">{result.ticket.passengerName}</div>
              </div>
            )}
            <div className="mt-2 text-sm opacity-90">{result.message}</div>
            {result.outcome !== 'boarded' && (
              <div className="mt-4 flex gap-2">
                {result.outcome === 'unpaid' && (
                  <Button variant="secondary" onClick={() => scan(lastCode, true)}>
                    Collected · board
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setResult(null)}>
                  Next passenger
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {err && (
        <div className="mt-3">
          <ErrorBox message={err} />
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted">Point the camera at the passenger's QR code. Forgot their phone? Use the passenger list.</p>
    </div>
  );
}
