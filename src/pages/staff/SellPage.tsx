import React, { useMemo, useState } from 'react';
import type { Channel, Partner, PaymentMethod, PublicStaff, TripSummary } from '../../../shared/types';
import { PLATFORMS } from '../../../shared/types';
import { commissionFor } from '../../../shared/logic';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { formatDate, formatEUR, todayIso } from '../../lib/format';
import { Button, Card, Empty, ErrorBox, Field, Input, PageHeader, Select, Spinner } from '../../components/ui';
import { SeatMap } from '../../components/SeatMap';
import { BookingDetail, type BookingDetailData } from '../../components/BookingDetail';

const TYPES: { id: Channel; label: string; hint: string }[] = [
  { id: 'seller', label: 'Walk-up', hint: 'Street, hostel, phone or WhatsApp customer' },
  { id: 'platform', label: 'Platform', hint: 'GetYourGuide, Viator, Airbnb…' },
  { id: 'group', label: 'Group', hint: 'One organiser, many seats, agreed price' },
];

export function SellPage({ staff, search }: { staff: PublicStaff; search: URLSearchParams }) {
  const trips = useApi<TripSummary[]>('/trips?scope=upcoming');
  const partners = useApi<Partner[]>('/partners');
  const [tripId, setTripId] = useState(search.get('trip') ?? '');
  const trip = useApi<TripSummary & { seatsTaken: number[] }>(tripId ? `/trips/${tripId}` : null);
  const manager = staff.role === 'owner' || staff.role === 'coordinator';

  const [channel, setChannel] = useState<Channel>('seller');
  const [seats, setSeats] = useState<number[]>([]);
  const [payer, setPayer] = useState({ name: '', email: '', phone: '' });
  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [externalRef, setExternalRef] = useState('');
  const [amount, setAmount] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<BookingDetailData | null>(null);

  const t = trip.data;
  const listTotal = t ? Math.round(t.price * seats.length * 100) / 100 : 0;
  const total = channel === 'seller' && !manager ? listTotal : amount !== '' ? Number(amount) : listTotal;
  const commission = staff.role === 'seller' ? commissionFor(method === 'free' ? 0 : total, staff.commissionRate) : 0;
  const bookable = useMemo(() => (trips.data ?? []).filter((x) => x.status === 'scheduled' || x.status === 'boarding'), [trips.data]);

  const toggle = (n: number) => setSeats((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort((a, b) => a - b)));
  const autoPick = (count: number) => {
    if (!t) return;
    const free: number[] = [];
    for (let s = 1; s <= t.capacity && free.length < count; s++) if (!t.seatsTaken.includes(s)) free.push(s);
    setSeats(free);
  };
  const reset = () => {
    setSeats([]);
    setPayer({ name: '', email: '', phone: '' });
    setExternalRef('');
    setAmount('');
    setNotes('');
    setDone(null);
    trip.reload();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!seats.length) return setErr('Pick at least one seat.');
    setBusy(true);
    try {
      const res = await api<BookingDetailData>('/bookings', {
        body: {
          tripId,
          channel,
          seats,
          payer,
          paymentMethod: channel === 'platform' ? 'platform' : method,
          paymentStatus: method === 'stripe' ? 'unpaid' : 'paid',
          amount: amount === '' ? undefined : Number(amount),
          platform: channel === 'platform' ? platform : undefined,
          externalRef: externalRef || undefined,
          partnerId: partnerId || undefined,
          notes: notes || undefined,
        },
      });
      setDone(res);
    } catch (e) {
      setErr(errorText(e));
      trip.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Sell seats" sub={staff.role === 'seller' && staff.commissionRate ? `Your commission: ${staff.commissionRate}% of every paid sale.` : undefined} />

      <Card className="mb-5">
        <Field label="Trip">
          <Select
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setSeats([]);
            }}
          >
            <option value="">Choose a departure…</option>
            {bookable.map((x) => (
              <option key={x.id} value={x.id}>
                {x.date === todayIso() ? 'Today' : formatDate(x.date)} {x.departureTime} · {x.name} ({x.capacity - x.sold - x.held} free)
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {!tripId && !trips.loading && !bookable.length && <Empty title="No trips open for sale" />}
      {tripId && trip.loading && <Spinner />}
      {trip.error && <ErrorBox message={trip.error} />}

      {t && (
        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[auto_1fr]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">Seats</span>
              <div className="flex gap-1">
                {[1, 2, 4].map((n) => (
                  <button key={n} type="button" onClick={() => autoPick(n)} className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-medium text-muted hover:text-ink">
                    Next {n}
                  </button>
                ))}
              </div>
            </div>
            <SeatMap capacity={t.capacity} taken={t.seatsTaken} selected={seats} onToggle={toggle} />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => {
                    setChannel(x.id);
                    setMethod(x.id === 'platform' ? 'platform' : 'stripe');
                  }}
                  className={`rounded-xl border p-3 text-left ${channel === x.id ? 'border-brand bg-blue-50/60' : 'border-line bg-white'}`}
                >
                  <div className="text-sm font-semibold text-ink">{x.label}</div>
                  <div className="text-[11px] leading-tight text-muted">{x.hint}</div>
                </button>
              ))}
            </div>

            {channel === 'platform' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    {PLATFORMS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Platform booking ref">
                  <Input required value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="GYG123ABC" />
                </Field>
              </div>
            )}

            <Field label={channel === 'group' ? 'Organiser name' : 'Customer name'}>
              <Input required value={payer.name} onChange={(e) => setPayer({ ...payer, name: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WhatsApp" hint="With country code. Used to send tickets and the payment link.">
                <Input type="tel" value={payer.phone} onChange={(e) => setPayer({ ...payer, phone: e.target.value })} placeholder="+34 612 345 678" />
              </Field>
              <Field label="Email (optional)">
                <Input type="email" value={payer.email} onChange={(e) => setPayer({ ...payer, email: e.target.value })} />
              </Field>
            </div>

            {channel !== 'platform' && (
              <Field label="Payment">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['stripe', 'Stripe link', 'Customer pays by card on their phone'],
                      ['cash', 'Cash', 'Collected now'],
                      ['card_terminal', 'Card terminal', 'Paid on the terminal now'],
                      ...(channel === 'group' ? [['invoice', 'Invoice', 'Paid later by transfer']] : []),
                      ...(manager ? [['free', 'Free seat', 'Guide, partner, complimentary']] : []),
                    ] as [PaymentMethod, string, string][]
                  ).map(([id, label, hint]) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setMethod(id)}
                      className={`rounded-xl border p-3 text-left ${method === id ? 'border-brand bg-blue-50/60' : 'border-line bg-white'}`}
                    >
                      <div className="text-sm font-semibold text-ink">{label}</div>
                      <div className="text-[11px] text-muted">{hint}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {(manager || channel !== 'seller') && method !== 'free' && (
              <Field label={channel === 'platform' ? 'Amount received from platform (€)' : 'Total price (€)'} hint={`List price: ${formatEUR(listTotal)}. Leave empty to use it.`}>
                <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(listTotal)} />
              </Field>
            )}

            {manager && (partners.data?.length ?? 0) > 1 && (
              <Field label="Revenue goes to" hint="Also decides which Stripe account a payment link charges.">
                <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Default ({partners.data![0].name})</option>
                  {partners.data!.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Notes (optional)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pick-up note, special request…" />
            </Field>

            <Card className="bg-paper">
              <div className="flex justify-between text-sm text-muted">
                <span>{seats.length ? `Seats ${seats.join(', ')}` : 'No seats selected'}</span>
                {commission > 0 && <span>Your commission {formatEUR(commission)}</span>}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-2xl font-bold text-ink">{formatEUR(method === 'free' ? 0 : total)}</span>
              </div>
            </Card>

            {err && <ErrorBox message={err} />}
            <Button type="submit" loading={busy} disabled={!seats.length} className="w-full py-3">
              {method === 'stripe' && channel !== 'platform' ? 'Book & create Stripe payment link' : 'Book & issue tickets'}
            </Button>
          </div>
        </form>
      )}

      {done && <BookingDetail id={done.booking.id} initial={done} staff={staff} onClose={reset} />}
    </div>
  );
}
