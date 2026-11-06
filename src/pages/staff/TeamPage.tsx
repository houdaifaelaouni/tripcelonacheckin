import React, { useState } from 'react';
import { Copy, KeyRound, MessageCircle, Plus } from 'lucide-react';
import type { Partner, PublicStaff, Role } from '../../../shared/types';
import { KEY_ROLES, ROLES } from '../../../shared/types';
import { ROLE_INFO } from '../../../shared/permissions';
import { api, errorText } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { formatDateTime } from '../../lib/format';
import { Badge, Button, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';

interface IssuedKey {
  name: string;
  key: string;
  loginUrl: string;
  phone?: string;
}

export function TeamPage({ staff: me }: { staff: PublicStaff }) {
  const { data, error, loading, reload } = useApi<PublicStaff[]>('/staff');
  const partners = useApi<Partner[]>('/partners').data ?? [];
  const [editing, setEditing] = useState<Partial<PublicStaff> | null>(null);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function keyAction(s: PublicStaff, revoke = false) {
    const msg = revoke
      ? `Revoke ${s.name}'s access key? They are signed out on every device immediately.`
      : s.keyHint
        ? `Issue a new key for ${s.name}? The old key stops working and they are signed out everywhere.`
        : null;
    if (msg && !confirm(msg)) return;
    setBusy(s.id);
    setErr(null);
    try {
      if (revoke) await api(`/staff/${s.id}/key`, { method: 'DELETE' });
      else {
        const r = await api<{ key: string; loginUrl: string }>(`/staff/${s.id}/key`, { body: {} });
        setIssued({ name: s.name, phone: s.phone, ...r });
      }
      reload();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(s: PublicStaff) {
    if (s.active && !confirm(`Deactivate ${s.name}? They lose access immediately.`)) return;
    setBusy(s.id);
    try {
      await api(`/staff/${s.id}`, { method: 'PATCH', body: { active: !s.active } });
      reload();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Team & access keys"
        sub="Owners and partners sign in with Google. Everyone else gets a personal access key you can revoke at any time."
        actions={
          <Button onClick={() => setEditing({ role: 'seller' })}>
            <Plus className="h-4 w-4" /> Add person
          </Button>
        }
      />
      {err && (
        <div className="mb-3">
          <ErrorBox message={err} />
        </div>
      )}
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data &&
        ROLES.map((role) => {
          const people = data.filter((s) => s.role === role);
          if (!people.length) return null;
          return (
            <div key={role} className="mb-6">
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="font-extrabold text-ink">{ROLE_INFO[role].title}s</h2>
                <span className="text-xs text-muted">{ROLE_INFO[role].summary}</span>
              </div>
              <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
                {people.map((s) => (
                  <div key={s.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${s.active ? '' : 'opacity-60'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        {s.name}
                        {!s.active && <Badge tone="red">Inactive</Badge>}
                        {s.role === 'seller' && <Badge tone="blue">{s.commissionRate ?? 0}% commission</Badge>}
                        {s.partnerId && <Badge>{partners.find((p) => p.id === s.partnerId)?.name ?? 'Partner'}</Badge>}
                      </div>
                      <div className="text-xs text-muted">
                        {s.email ||
                          (s.keyHint ? `Key ••••${s.keyHint} · issued ${formatDateTime(s.keyIssuedAt)}` : 'No access key')}
                        {s.lastLoginAt ? ` · last sign-in ${formatDateTime(s.lastLoginAt)}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {KEY_ROLES.includes(s.role) && s.active && (
                        <>
                          <Button variant="secondary" className="!py-1.5" loading={busy === s.id} onClick={() => keyAction(s)}>
                            <KeyRound className="h-4 w-4" /> {s.keyHint ? 'New key' : 'Issue key'}
                          </Button>
                          {s.keyHint && (
                            <Button variant="ghost" className="!py-1.5" onClick={() => keyAction(s, true)}>
                              Revoke
                            </Button>
                          )}
                        </>
                      )}
                      <Button variant="ghost" className="!py-1.5" onClick={() => setEditing(s)}>
                        Edit
                      </Button>
                      {s.id !== me.id && (
                        <Button variant="ghost" className="!py-1.5" onClick={() => toggleActive(s)}>
                          {s.active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {editing && (
        <StaffForm
          person={editing}
          partners={partners}
          onClose={() => setEditing(null)}
          onSaved={(key) => {
            setEditing(null);
            if (key) setIssued(key);
            reload();
          }}
        />
      )}
      {issued && <KeyReveal issued={issued} onClose={() => setIssued(null)} />}
    </div>
  );
}

function StaffForm({ person, partners, onClose, onSaved }: { person: Partial<PublicStaff>; partners: Partner[]; onClose: () => void; onSaved: (k?: IssuedKey) => void }) {
  const isNew = !person.id;
  const [f, setF] = useState({
    name: person.name ?? '',
    role: (person.role ?? 'seller') as Role,
    email: person.email ?? '',
    phone: person.phone ?? '',
    partnerId: person.partnerId ?? '',
    commissionRate: String(person.commissionRate ?? 10),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const google = !KEY_ROLES.includes(f.role);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = {
        name: f.name,
        role: f.role,
        email: google ? f.email : undefined,
        phone: f.phone,
        partnerId: f.partnerId,
        ...(f.role === 'seller' ? { commissionRate: Number(f.commissionRate) } : {}),
      };
      if (isNew) {
        const r = await api<{ staff: PublicStaff; accessKey?: { key: string; loginUrl: string } }>('/staff', { body });
        onSaved(r.accessKey ? { name: r.staff.name, phone: r.staff.phone, ...r.accessKey } : undefined);
      } else {
        await api(`/staff/${person.id}`, { method: 'PATCH', body });
        onSaved();
      }
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add person' : `Edit ${person.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name">
          <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Role" hint={ROLE_INFO[f.role].summary}>
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].title}
              </option>
            ))}
          </Select>
        </Field>
        {google ? (
          <Field label="Google email" hint="They sign in with this Google account.">
            <Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
        ) : (
          <Field label="WhatsApp (optional)" hint="Lets you send their access key with one tap.">
            <Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+34 …" />
          </Field>
        )}
        {(f.role === 'partner' || f.role === 'seller') && (
          <Field label={f.role === 'partner' ? 'Partner business' : 'Sales count towards'} hint={f.role === 'seller' ? 'Which business gets the revenue (and Stripe payments) for their sales.' : undefined}>
            <Select required={f.role === 'partner'} value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })}>
              <option value="">{f.role === 'partner' ? 'Choose…' : 'Default partner'}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {f.role === 'seller' && (
          <Field label="Commission (%)" hint="Earned on every paid sale.">
            <Input type="number" min={0} max={100} step="0.5" value={f.commissionRate} onChange={(e) => setF({ ...f, commissionRate: e.target.value })} />
          </Field>
        )}
        {err && <ErrorBox message={err} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {isNew ? (google ? 'Add' : 'Add & create key') : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function KeyReveal({ issued, onClose }: { issued: IssuedKey; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (label: string, text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  const msg = `Hi ${issued.name.split(' ')[0]}! Here is your Tripcelona access link: ${issued.loginUrl}\n\nKeep it private, it's personal to you.`;
  const wa = `https://wa.me/${(issued.phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;

  return (
    <Modal title={`Access key for ${issued.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-gold-soft px-4 py-3 text-sm font-medium text-[#5c3b00]">This is the only time the key is shown. Send it now; if it's lost, just issue a new one.</div>
        <Field label="Invite link (one tap sign-in)">
          <div className="flex gap-2">
            <Input readOnly value={issued.loginUrl} className="font-mono text-xs" />
            <Button variant="secondary" onClick={() => copy('link', issued.loginUrl)}>
              <Copy className="h-4 w-4" /> {copied === 'link' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Field>
        <Field label="Access key">
          <div className="flex gap-2">
            <Input readOnly value={issued.key} className="font-mono" />
            <Button variant="secondary" onClick={() => copy('key', issued.key)}>
              <Copy className="h-4 w-4" /> {copied === 'key' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Field>
        <a href={wa} target="_blank" rel="noreferrer" className="block">
          <Button variant="share" className="w-full">
            <MessageCircle className="h-4 w-4" /> Send on WhatsApp
          </Button>
        </a>
      </div>
    </Modal>
  );
}
