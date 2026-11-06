import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, CreditCard, Lock, MapPin, Users } from 'lucide-react';
import type { PublicTrip } from '../../../shared/types';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { formatDate, formatEUR } from '../../lib/format';
import { navigate } from '../../lib/router';
import { Button, Card, Empty, ErrorBox, Field, Input, Spinner } from '../../components/ui';
import { SeatMap } from '../../components/SeatMap';
import { PublicShell } from './PublicShell';

interface BookingInfo {
  slot: number;
  partnerName: string;
  trips: PublicTrip[];
}

export function BookingPage({ slot, search }: { slot: string; search: URLSearchParams }) {
  const { data, error, loading, reload } = useApi<BookingInfo>(`/public/booking/${slot}`);
  const [tripId, setTripId] = useState<string | null>(search.get('trip'));
  const cancelled = search.get('cancelled');

  // Customer came back from Stripe without paying: free their seats now.
  useEffect(() => {
    if (cancelled) api(`/public/bookings/${cancelled}/release`, { body: {} }).then(reload, reload);
  }, [cancelled, reload]);

  const trip = data?.trips.find((t) => t.id === tripId) ?? null;

  return (
    <PublicShell subtitle={data?.partnerName}>
      {cancelled && (
        <div className="mb-4 rounded-lg bg-gold-soft px-4 py-3 text-sm font-medium text-[#5c3b00]">Payment was not completed, so your seats were released. You can book again below.</div>
      )}
      {loading && <Spinner label="Loading trips" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !trip && <TripList trips={data.trips} onPick={setTripId} />}
      {data && trip && (
        <Checkout
          slot={Number(slot)}
          trip={trip}
          onBack={() => {
            setTripId(null);
            navigate(`/book/${slot}`, true);
          }}
        />
      )}
    </PublicShell>
  );
}

function TripList({ trips, onPick }: { trips: PublicTrip[]; onPick: (id: string) => void }) {
  if (!trips.length) return <Empty title="No trips on sale right now">New departures are added every week. Check back soon!</Empty>;
  return (
    <div>
      <h1 className="mb-1.5 text-[32px] font-black leading-tight text-ink">Choose your day trip</h1>
      <p className="mb-6 text-[15px] text-body">Pick a departure, choose your seats and pay securely by card.</p>
      <div className="grid gap-3">
        {trips.map((t) => {
          const left = t.capacity - t.seatsTaken.length;
          return (
            <button key={t.id} onClick={() => left > 0 && onPick(t.id)} disabled={left <= 0} className="text-left">
              <Card className={`transition ${left > 0 ? 'hover:border-ink' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-extrabold text-ink">{t.name}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(t.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {t.departureTime}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {t.meetingPoint}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-ink">{formatEUR(t.price)}</div>
                    <div className={`mt-1 text-[13px] font-bold ${left <= 5 ? 'text-alert-ink' : 'text-body'}`}>
                      {left <= 0 ? 'Sold out' : `${left} seat${left === 1 ? '' : 's'} left`}
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Checkout({ slot, trip, onBack }: { slot: number; trip: PublicTrip; onBack: () => void }) {
  const [seats, setSeats] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [others, setOthers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [taken, setTaken] = useState(trip.seatsTaken);

  const total = useMemo(() => Math.round(trip.price * seats.length * 100) / 100, [trip.price, seats.length]);
  const toggle = (n: number) => setSeats((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort((a, b) => a - b)));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!seats.length) return setErr('Pick at least one seat.');
    setBusy(true);
    try {
      const passengerNames = seats.map((_, i) => (i === 0 ? name : others[i - 1] || ''));
      const res = await api<{ url: string }>('/public/checkout', { body: { slot, tripId: trip.id, seats, name, email, phone, passengerNames } });
      window.location.href = res.url; // Stripe Checkout
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
      // Someone may have taken a seat meanwhile: refresh the map.
      api<PublicTrip>(`/public/trips/${trip.id}`)
        .then((t) => {
          setTaken(t.seatsTaken);
          setSeats((s) => s.filter((n) => !t.seatsTaken.includes(n)));
        })
        .catch(() => undefined);
    }
  }

  return (
    <form onSubmit={pay}>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All trips
      </button>
      <h1 className="text-[32px] font-black leading-tight text-ink">{trip.name}</h1>
      <p className="mt-1.5 text-[15px] text-body">
        {formatDate(trip.date, { weekday: 'long', day: 'numeric', month: 'long' })} · departure {trip.departureTime} · {trip.meetingPoint}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-extrabold text-ink">1. Choose your seats</h2>
          <SeatMap capacity={trip.capacity} taken={taken} selected={seats} onToggle={toggle} max={10} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-ink">2. Your details</h2>
          <Field label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email" hint="Your tickets are sent here.">
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="WhatsApp number (optional)" hint="With country code, e.g. +34 612 345 678. Used only for trip-day updates.">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
          {seats.length > 1 && (
            <div className="space-y-2">
              <span className="block text-sm font-bold text-ink">Other passengers (optional)</span>
              {seats.slice(1).map((s, i) => (
                <Input
                  key={s}
                  placeholder={`Name for seat ${s}`}
                  value={others[i] || ''}
                  onChange={(e) => setOthers((o) => Object.assign([...o], { [i]: e.target.value }))}
                />
              ))}
            </div>
          )}

          <Card className="bg-mint/60 border-moss/30">
            <div className="flex items-center justify-between text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {seats.length ? `Seat${seats.length > 1 ? 's' : ''} ${seats.join(', ')}` : 'No seats selected'}
              </span>
              <span>
                {seats.length} × {formatEUR(trip.price)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-extrabold text-ink">Total</span>
              <span className="text-3xl font-black text-ink">{formatEUR(total)}</span>
            </div>
          </Card>

          {err && <ErrorBox message={err} />}
          <Button type="submit" variant="accent" loading={busy} disabled={!seats.length} className="min-h-14 w-full text-base">
            <CreditCard className="h-5 w-5" /> Pay {seats.length ? formatEUR(total) : ''} with Stripe
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <Lock className="h-3.5 w-3.5" /> Secure card payment by Stripe. Your seats are held for 30 minutes.
          </p>
        </div>
      </div>
    </form>
  );
}
