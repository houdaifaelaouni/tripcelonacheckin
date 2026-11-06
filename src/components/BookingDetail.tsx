import React, { useState } from 'react';
import { Copy, CreditCard, ExternalLink, Mail, MessageCircle, XCircle } from 'lucide-react';
import type { Booking, PublicStaff, Ticket, Trip } from '../../shared/types';
import { can } from '../../shared/permissions';
import { api, errorText } from '../lib/api';
import { useApi } from '../lib/hooks';
import { CHANNEL_LABEL, METHOD_LABEL, formatDate, formatDateTime, formatEUR } from '../lib/format';
import { Badge, Button, ErrorBox, Modal, Select, Spinner } from './ui';

export interface BookingDetailData {
  booking: Booking;
  trip: Trip;
  tickets: (Ticket & { url: string })[];
  whatsappUrl: string | null;
  paymentUrl?: string;
  emailStatus?: string;
}

export function PaymentBadge({ b }: { b: Pick<Booking, 'status' | 'payment'> }) {
  if (b.status === 'cancelled') return <Badge tone="red">Cancelled</Badge>;
  if (b.status === 'held') return <Badge tone="amber">Awaiting payment</Badge>;
  if (b.status === 'expired') return <Badge>Expired</Badge>;
  if (b.payment.status === 'paid') return <Badge tone="green">Paid · {METHOD_LABEL[b.payment.method]}</Badge>;
  if (b.payment.status === 'refunded') return <Badge tone="red">Refunded</Badge>;
  return <Badge tone="amber">Unpaid{b.payment.method === 'stripe' ? ' · Stripe link sent' : ''}</Badge>;
}

export function BookingDetail({ id, staff, onClose, onChanged, initial }: { id: string; staff: PublicStaff; onClose: () => void; onChanged?: () => void; initial?: BookingDetailData }) {
  const { data: loaded, error, reload, setData } = useApi<BookingDetailData>(initial ? null : `/bookings/${id}`);
  const data = loaded ?? initial ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(initial?.paymentUrl ?? null);
  const [paidMethod, setPaidMethod] = useState('cash');
  const [copied, setCopied] = useState(false);

  const b = data?.booking;
  const mine = b && (can(staff.role, 'manifest.edit') || (staff.role === 'seller' && b.sellerId === staff.id));

  async function act(name: string, path: string, body: object = {}) {
    setBusy(name);
    setErr(null);
    try {
      const r = await api<BookingDetailData & { paymentUrl?: string; emailStatus?: string }>(path, { body });
      if (r.booking) setData(r);
      if (r.paymentUrl) setPayUrl(r.paymentUrl);
      if (name === 'email') setErr(r.emailStatus === 'sent' ? null : r.emailStatus === 'skipped' ? 'Email is not set up yet (Owner → Partners & Stripe).' : 'Email could not be sent.');
      onChanged?.();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  const link = payUrl || b?.paymentUrl;
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const payWhatsapp =
    link && b?.payer.phone
      ? `https://wa.me/${b.payer.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${b.payer.name.split(' ')[0]}! Here is your secure payment link for ${data!.trip.name} on ${data!.trip.date} (${formatEUR(b.amount)}): ${link}`)}`
      : null;

  return (
    <Modal title={b ? `Booking ${b.id}` : 'Booking'} onClose={onClose} wide>
      {!data && !error && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && b && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-ink">{b.payer.name}</div>
              <div className="text-sm text-muted">{[b.payer.email, b.payer.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
              <div className="mt-1 text-sm text-muted">
                {data.trip.name} · {formatDate(data.trip.date)} {data.trip.departureTime}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-ink">{formatEUR(b.amount)}</div>
              <PaymentBadge b={b} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="blue">{CHANNEL_LABEL[b.channel]}</Badge>
            {b.platform && <Badge>{b.platform}</Badge>}
            {b.externalRef && <Badge>Ref {b.externalRef}</Badge>}
            {b.commission && (
              <Badge tone={b.commission.settled ? 'green' : 'gray'}>
                Commission {formatEUR(b.commission.amount)} {b.commission.settled ? 'paid' : 'owed'}
              </Badge>
            )}
            <span className="text-muted">Created {formatDateTime(b.createdAt)}</span>
          </div>
          {b.notes && <div className="rounded-xl bg-paper p-3 text-sm text-ink">{b.notes}</div>}

          {/* Stripe payment link for unpaid staff sales */}
          {mine && b.status === 'confirmed' && b.payment.status === 'unpaid' && b.amount > 0 && (
            <div className="rounded-2xl border border-brand/30 bg-blue-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <CreditCard className="h-4 w-4 text-brand" /> Customer pays with Stripe
              </div>
              {link ? (
                <div className="space-y-2">
                  <div className="truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-muted">{link}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => copy(link)}>
                      <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy link'}
                    </Button>
                    {payWhatsapp && (
                      <a href={payWhatsapp} target="_blank" rel="noreferrer">
                        <Button variant="success">
                          <MessageCircle className="h-4 w-4" /> Send on WhatsApp
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" loading={busy === 'link'} onClick={() => act('link', `/bookings/${b.id}/payment-link`)}>
                      New link
                    </Button>
                  </div>
                  <p className="text-xs text-muted">The booking turns “Paid” automatically when the customer pays. Links stay valid for 24 hours.</p>
                </div>
              ) : (
                <Button loading={busy === 'link'} onClick={() => act('link', `/bookings/${b.id}/payment-link`)}>
                  Create Stripe payment link
                </Button>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand/10 pt-3 text-sm">
                <span className="text-muted">Paid another way?</span>
                <Select value={paidMethod} onChange={(e) => setPaidMethod(e.target.value)} className="!w-auto !py-1.5">
                  <option value="cash">Cash</option>
                  <option value="card_terminal">Card terminal</option>
                  <option value="invoice">Invoice</option>
                </Select>
                <Button variant="secondary" loading={busy === 'paid'} onClick={() => act('paid', `/bookings/${b.id}/mark-paid`, { method: paidMethod })}>
                  Mark as paid
                </Button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-semibold text-ink">Tickets</div>
            <div className="divide-y divide-line rounded-2xl border border-line">
              {data.tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper font-bold text-ink">{t.seat}</span>
                    <div>
                      <div className="font-medium text-ink">{t.passengerName}</div>
                      <div className="text-xs text-muted">{t.status === 'checked_in' ? `Boarded ${formatDateTime(t.checkedInAt)}` : t.status === 'cancelled' ? 'Cancelled' : 'Not boarded yet'}</div>
                    </div>
                  </div>
                  {t.status !== 'cancelled' && (
                    <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                      Pass <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
              {!data.tickets.length && <div className="px-4 py-3 text-sm text-muted">Tickets are issued once the payment is confirmed.</div>}
            </div>
          </div>

          {err && <ErrorBox message={err} />}

          {b.status === 'confirmed' && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {data.whatsappUrl && b.payer.phone && (
                <a href={data.whatsappUrl} target="_blank" rel="noreferrer">
                  <Button variant="success">
                    <MessageCircle className="h-4 w-4" /> Send tickets on WhatsApp
                  </Button>
                </a>
              )}
              {mine && b.payer.email && (
                <Button variant="secondary" loading={busy === 'email'} onClick={() => act('email', `/bookings/${b.id}/email`)}>
                  <Mail className="h-4 w-4" /> Email tickets
                </Button>
              )}
              {mine && (
                <Button
                  variant="danger"
                  className="ml-auto"
                  loading={busy === 'cancel'}
                  onClick={() => {
                    if (confirm(`Cancel booking ${b.id} and free ${b.seats.length} seat(s)?${b.payment.status === 'paid' ? '\n\nIt is paid: refund it separately (in Stripe or in cash).' : ''}`)) act('cancel', `/bookings/${b.id}/cancel`);
                  }}
                >
                  <XCircle className="h-4 w-4" /> Cancel booking
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
