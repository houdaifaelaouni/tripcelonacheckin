// Owner tools: staff & access keys, partner businesses, payment set-up.
import { Router } from 'express';
import type { Partner, Role, Staff } from '../../shared/types';
import { KEY_ROLES, ROLES, GOOGLE_ROLES } from '../../shared/types';
import { col, audit, nowIso } from '../firebase';
import { bad, conflict, forbidden, handle, me, notFound, publicStaff, requirePermission, str } from '../http';
import { issueAccessKey, newId } from '../security';
import { stripeStatus } from '../stripe';
import { stripUndefined } from '../seats';
import { env } from '../env';

export const staffRouter = Router();
export const partnersRouter = Router();
export const settingsRouter = Router();

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

// Owners and coordinators need the list (assign drivers, filter by seller).
staffRouter.get(
  '/',
  handle(async (req, res) => {
    const staff = me(req);
    if (staff.role !== 'owner' && staff.role !== 'coordinator') throw forbidden();
    const all = (await col.staff().get()).docs.map((d) => publicStaff(d.data() as Staff));
    all.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
    res.json(staff.role === 'owner' ? all : all.map(({ email: _e, phone: _p, ...s }) => s));
  }),
);

function readStaffInput(body: Record<string, unknown>, existing?: Staff): Partial<Staff> {
  const out: Partial<Staff> = {};
  if (body.name !== undefined || !existing) {
    out.name = str(body.name, 80);
    if (out.name.length < 2) throw bad('Enter a name.');
  }
  if (body.role !== undefined || !existing) {
    if (!ROLES.includes(body.role as Role)) throw bad('Choose a role.');
    out.role = body.role as Role;
  }
  const role = out.role ?? existing!.role;
  if (body.email !== undefined || (!existing && GOOGLE_ROLES.includes(role))) {
    out.email = str(body.email, 200).toLowerCase() || undefined;
    if (GOOGLE_ROLES.includes(role) && !out.email?.includes('@')) throw bad('Owners and partners need a Google email to sign in.');
  }
  if (body.partnerId !== undefined) out.partnerId = str(body.partnerId, 32) || undefined;
  if (role === 'partner' && !(out.partnerId ?? existing?.partnerId)) throw bad('Choose which partner business this person belongs to.');
  if (body.commissionRate !== undefined) {
    const r = Number(body.commissionRate);
    if (!(r >= 0 && r <= 100)) throw bad('Commission must be between 0 and 100%.');
    out.commissionRate = r;
  }
  if (body.phone !== undefined) out.phone = str(body.phone, 40) || undefined;
  if (body.active !== undefined) out.active = body.active === true;
  return out;
}

staffRouter.post(
  '/',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'staff.manage');
    const input = readStaffInput(req.body);
    if (input.email) {
      const dup = await col.staff().where('email', '==', input.email).limit(1).get();
      if (!dup.empty) throw conflict('Someone with this email already exists.');
    }
    const staff: Staff = {
      id: newId('S', 8),
      name: input.name!,
      role: input.role!,
      email: input.email,
      partnerId: input.partnerId,
      commissionRate: input.role === 'seller' ? input.commissionRate ?? 0 : undefined,
      phone: input.phone,
      active: true,
      tokenVersion: 0,
      createdAt: nowIso(),
    };
    let issued: { key: string; loginUrl: string } | undefined;
    if (KEY_ROLES.includes(staff.role)) {
      const k = issueAccessKey();
      Object.assign(staff, { keyLookupId: k.lookupId, keyHash: k.hash, keyHint: k.hint, keyIssuedAt: nowIso() });
      issued = { key: k.key, loginUrl: `${env.appUrl}/login#key=${k.key}` };
    }
    await col.staff().doc(staff.id).set(stripUndefined(staff));
    audit(owner.id, 'staff.create', { staffId: staff.id, role: staff.role });
    res.status(201).json({ staff: publicStaff(staff), accessKey: issued });
  }),
);

staffRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'staff.manage');
    const ref = col.staff().doc(String(req.params.id));
    const existing = (await ref.get()).data() as Staff | undefined;
    if (!existing) throw notFound('Staff member not found.');
    const patch = readStaffInput(req.body, existing);
    if (existing.id === owner.id && (patch.active === false || (patch.role && patch.role !== 'owner'))) {
      throw bad("You can't remove your own owner access.");
    }
    const roleChanged = patch.role && patch.role !== existing.role;
    const deactivated = patch.active === false && existing.active;
    const updated: Staff = {
      ...existing,
      ...patch,
      // Any change to who someone is logs them out everywhere.
      tokenVersion: (existing.tokenVersion ?? 0) + (roleChanged || deactivated ? 1 : 0),
      updatedAt: nowIso(),
    };
    // Moving to a Google role drops the access key.
    if (roleChanged && GOOGLE_ROLES.includes(updated.role)) {
      delete updated.keyHash;
      delete updated.keyLookupId;
      delete updated.keyHint;
    }
    await ref.set(stripUndefined(updated));
    audit(owner.id, 'staff.update', { staffId: existing.id, fields: Object.keys(patch) });
    res.json(publicStaff(updated));
  }),
);

// Issue or rotate a personal access key. The full key is shown ONCE.
staffRouter.post(
  '/:id/key',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'staff.manage');
    const ref = col.staff().doc(String(req.params.id));
    const s = (await ref.get()).data() as Staff | undefined;
    if (!s) throw notFound('Staff member not found.');
    if (!KEY_ROLES.includes(s.role)) throw bad(`${s.role === 'owner' ? 'Owners' : 'Partners'} sign in with Google, not a key.`);
    const k = issueAccessKey();
    await ref.update({
      keyLookupId: k.lookupId,
      keyHash: k.hash,
      keyHint: k.hint,
      keyIssuedAt: nowIso(),
      tokenVersion: (s.tokenVersion ?? 0) + 1,
      updatedAt: nowIso(),
    });
    audit(owner.id, s.keyHash ? 'key.rotate' : 'key.issue', { staffId: s.id });
    res.json({ key: k.key, loginUrl: `${env.appUrl}/login#key=${k.key}`, hint: k.hint });
  }),
);

staffRouter.delete(
  '/:id/key',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'staff.manage');
    const ref = col.staff().doc(String(req.params.id));
    const s = (await ref.get()).data() as Staff | undefined;
    if (!s) throw notFound('Staff member not found.');
    const { keyHash: _h, keyLookupId: _l, keyHint: _k, keyIssuedAt: _i, ...rest } = s;
    await ref.set(stripUndefined({ ...rest, tokenVersion: (s.tokenVersion ?? 0) + 1, updatedAt: nowIso() }));
    audit(owner.id, 'key.revoke', { staffId: s.id });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

partnersRouter.get(
  '/',
  handle(async (req, res) => {
    me(req); // any signed-in staff may see partner names (for sale forms & reports)
    const all = (await col.partners().get()).docs.map((d) => d.data() as Partner);
    res.json(all.sort((a, b) => a.stripeSlot - b.stripeSlot));
  }),
);

partnersRouter.post(
  '/',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'partners.manage');
    const name = str(req.body.name, 80);
    const slot = Number(req.body.stripeSlot);
    if (name.length < 2) throw bad('Enter the business name.');
    if (slot !== 1 && slot !== 2) throw bad('Choose booking link 1 or 2.');
    const clash = await col.partners().where('stripeSlot', '==', slot).limit(1).get();
    if (!clash.empty) throw conflict(`Booking link ${slot} already belongs to another partner.`);
    const partner: Partner = { id: newId('P', 6), name, stripeSlot: slot, contactEmail: str(req.body.contactEmail, 200) || undefined, createdAt: nowIso() };
    await col.partners().doc(partner.id).set(stripUndefined(partner));
    audit(owner.id, 'partner.create', { partnerId: partner.id });
    res.status(201).json(partner);
  }),
);

partnersRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const owner = requirePermission(req, 'partners.manage');
    const ref = col.partners().doc(String(req.params.id));
    const p = (await ref.get()).data() as Partner | undefined;
    if (!p) throw notFound('Partner not found.');
    const updated = {
      ...p,
      ...(req.body.name !== undefined ? { name: str(req.body.name, 80) || p.name } : {}),
      ...(req.body.contactEmail !== undefined ? { contactEmail: str(req.body.contactEmail, 200) || undefined } : {}),
      updatedAt: nowIso(),
    };
    await ref.set(stripUndefined(updated));
    audit(owner.id, 'partner.update', { partnerId: p.id });
    res.json(updated);
  }),
);

// ---------------------------------------------------------------------------
// Payment settings: shows which Stripe accounts are connected. Keys live in
// server environment variables only and are never sent to the browser.
// ---------------------------------------------------------------------------

settingsRouter.get(
  '/payments',
  handle(async (req, res) => {
    requirePermission(req, 'partners.manage');
    res.json({ accounts: stripeStatus(), emailConfigured: !!env.resendApiKey });
  }),
);
