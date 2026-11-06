// Two ways in: Google (owner, partners) or a personal access key
// (coordinators, sellers, drivers). Both end in the same signed session token.
import { Router } from 'express';
import type { SessionInfo, Staff } from '../../shared/types';
import { GOOGLE_ROLES, KEY_ROLES } from '../../shared/types';
import { adminAuth, col, audit, nowIso } from '../firebase';
import { HttpError, bad, handle, me, publicStaff, requireAuth, str } from '../http';
import { newId, parseAccessKey, signSession, verifyAccessKeySecret } from '../security';
import { env } from '../env';

export const authRouter = Router();

// Simple in-memory brake on key guessing (per server instance).
const attempts = new Map<string, { count: number; until: number }>();
function throttle(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.until > now && a.count >= 10) throw new HttpError(429, 'Too many attempts. Please wait a few minutes.');
  if (!a || a.until <= now) attempts.set(ip, { count: 1, until: now + 10 * 60_000 });
  else a.count++;
}

async function issueSession(staff: Staff): Promise<SessionInfo> {
  const exp = Date.now() + env.sessionHours * 3600_000;
  const token = signSession(env.sessionSecret, { sid: staff.id, role: staff.role, tv: staff.tokenVersion ?? 0, exp });
  await col.staff().doc(staff.id).update({ lastLoginAt: nowIso() });
  return { token, staff: publicStaff(staff), expiresAt: new Date(exp).toISOString() };
}

authRouter.post(
  '/google',
  handle(async (req, res) => {
    const idToken = str(req.body.idToken, 5000);
    if (!idToken) throw bad('Missing Google token.');
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      throw new HttpError(401, 'Google sign-in could not be verified. Please try again.');
    }
    const email = (decoded.email || '').toLowerCase();
    if (!email || !decoded.email_verified) throw new HttpError(401, 'Your Google email is not verified.');

    const snap = await col.staff().where('email', '==', email).limit(1).get();
    let staff = snap.empty ? null : (snap.docs[0].data() as Staff);

    // First login by a bootstrap owner creates their record.
    if (!staff && env.ownerEmails.includes(email)) {
      staff = {
        id: newId('S', 8),
        name: decoded.name || email.split('@')[0],
        email,
        role: 'owner',
        active: true,
        tokenVersion: 0,
        createdAt: nowIso(),
      };
      await col.staff().doc(staff.id).set(staff);
      audit(staff.id, 'owner.bootstrap', { email });
    }

    if (!staff || !staff.active || !GOOGLE_ROLES.includes(staff.role)) {
      throw new HttpError(403, 'This Google account has no access. Ask the owner to add you as a partner.');
    }
    res.json(await issueSession(staff));
  }),
);

authRouter.post(
  '/key',
  handle(async (req, res) => {
    throttle(req.ip || 'unknown');
    const parsed = parseAccessKey(str(req.body.key, 64));
    const invalid = new HttpError(401, 'That access key is not valid. Check it or ask the owner for a new one.');
    if (!parsed) throw invalid;
    const snap = await col.staff().where('keyLookupId', '==', parsed.lookupId).limit(1).get();
    const staff = snap.empty ? null : (snap.docs[0].data() as Staff);
    if (!staff?.keyHash || !verifyAccessKeySecret(parsed.secret, staff.keyHash)) throw invalid;
    if (!staff.active || !KEY_ROLES.includes(staff.role)) throw new HttpError(403, 'This access key has been disabled.');
    attempts.delete(req.ip || 'unknown');
    audit(staff.id, 'login.key', {});
    res.json(await issueSession(staff));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  handle(async (req, res) => {
    res.json({ staff: publicStaff(me(req)) });
  }),
);
