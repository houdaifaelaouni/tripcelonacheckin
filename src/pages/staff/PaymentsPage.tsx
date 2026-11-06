import React, { useState } from 'react';
import { CheckCircle2, Copy, XCircle } from 'lucide-react';
import type { Partner, StripeSlot } from '../../../shared/types';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { Badge, Button, Card, ErrorBox, Field, Input, PageHeader, Spinner } from '../../components/ui';

interface Account {
  slot: StripeSlot;
  configured: boolean;
  mode: 'live' | 'test' | 'missing';
  webhookConfigured: boolean;
  webhookUrl: string;
  bookingUrl: string;
}

export function PaymentsPage() {
  const partners = useApi<Partner[]>('/partners');
  const settings = useApi<{ accounts: Account[]; emailConfigured: boolean }>('/settings/payments');

  if (partners.loading || settings.loading) return <Spinner />;
  if (partners.error || settings.error) return <ErrorBox message={partners.error || settings.error || ''} />;

  return (
    <div>
      <PageHeader
        title="Partners & Stripe"
        sub="Each partner business owns one public booking link and one Stripe account. Customers who book through /book/1 pay partner 1's Stripe; /book/2 pays partner 2's."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {settings.data!.accounts.map((acc) => (
          <SlotCard key={acc.slot} account={acc} partner={partners.data!.find((p) => p.stripeSlot === acc.slot)} onSaved={partners.reload} />
        ))}
      </div>
      <Card className="mt-4">
        <div className="flex items-center gap-2 font-semibold text-ink">
          {settings.data!.emailConfigured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-500" />}
          Ticket emails
        </div>
        <p className="mt-1 text-sm text-muted">
          {settings.data!.emailConfigured
            ? 'Customers get their tickets by email automatically after paying.'
            : 'Not set up: add RESEND_API_KEY and EMAIL_FROM to the server environment to email tickets. WhatsApp sharing works without it.'}
        </p>
      </Card>
      <p className="mt-6 text-xs text-muted">
        Stripe secret keys are stored only in the server environment (STRIPE_SECRET_KEY_1/2, STRIPE_WEBHOOK_SECRET_1/2), never in the database or the browser.
      </p>
    </div>
  );
}

function SlotCard({ account, partner, onSaved }: { account: Account; partner?: Partner; onSaved: () => void }) {
  const [name, setName] = useState(partner?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (k: string, v: string) =>
    navigator.clipboard?.writeText(v).then(() => {
      setCopied(k);
      setTimeout(() => setCopied(null), 1500);
    });

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      if (partner) await api(`/partners/${partner.id}`, { method: 'PATCH', body: { name } });
      else await api('/partners', { body: { name, stripeSlot: account.slot } });
      onSaved();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const Row = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
      <span className={ok ? 'text-ink' : 'text-red-700'}>{label}</span>
    </div>
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-ink">Booking link {account.slot}</div>
        <Badge tone={account.mode === 'live' ? 'green' : account.mode === 'test' ? 'amber' : 'red'}>{account.mode === 'missing' ? 'Stripe not connected' : `Stripe ${account.mode} mode`}</Badge>
      </div>
      <Field label="Partner business">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" />
          <Button variant="secondary" loading={busy} disabled={name.trim().length < 2 || name === partner?.name} onClick={save}>
            {partner ? 'Rename' : 'Create'}
          </Button>
        </div>
      </Field>
      {err && (
        <div className="mt-2">
          <ErrorBox message={err} />
        </div>
      )}
      <div className="mt-4 space-y-1.5">
        <Row ok={!!partner} label={partner ? 'Partner assigned' : 'No partner yet: online sales on this link are off'} />
        <Row ok={account.configured} label={account.configured ? 'Stripe secret key set' : `Set STRIPE_SECRET_KEY_${account.slot} on the server`} />
        <Row ok={account.webhookConfigured} label={account.webhookConfigured ? 'Webhook secret set' : `Set STRIPE_WEBHOOK_SECRET_${account.slot} on the server`} />
      </div>
      <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {[
          ['Public booking page', account.bookingUrl],
          ['Stripe webhook URL', account.webhookUrl],
        ].map(([label, url]) => (
          <div key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-paper px-2 py-1 text-xs">{url}</code>
              <button onClick={() => copy(label, url)} className="text-muted hover:text-ink" aria-label={`Copy ${label}`}>
                {copied === label ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted">
          In Stripe → Developers → Webhooks, send <b>checkout.session.completed</b>, <b>checkout.session.expired</b>, <b>checkout.session.async_payment_succeeded</b>,{' '}
          <b>checkout.session.async_payment_failed</b> and <b>charge.refunded</b> to the URL above.
        </p>
      </div>
    </Card>
  );
}
