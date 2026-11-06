import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Staff } from '../shared/types.js';
import { can, type Permission } from '../shared/permissions.js';
import { verifySession } from './security.js';
import { col } from './firebase.js';
import { env } from './env.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const bad = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = 'You do not have access to this.') => new HttpError(403, msg);
export const notFound = (what = 'Not found') => new HttpError(404, what);
export const conflict = (msg: string) => new HttpError(409, msg);

export function handle(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error('[api] unexpected error', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

declare module 'express-serve-static-core' {
  interface Request {
    staff?: Staff;
  }
}

/** Loads req.staff from the Bearer token. Re-checks the staff record on every
 *  request so deactivation and key revocation take effect immediately. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  (async () => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Please sign in.');
    const payload = verifySession(env.sessionSecret, token);
    if (!payload) throw new HttpError(401, 'Your session has expired. Please sign in again.');
    const snap = await col.staff().doc(payload.sid).get();
    const staff = snap.exists ? (snap.data() as Staff) : null;
    if (!staff || !staff.active || (staff.tokenVersion ?? 0) !== payload.tv) {
      throw new HttpError(401, 'Your access has changed. Please sign in again.');
    }
    req.staff = staff;
  })().then(() => next(), next);
};

export function me(req: Request): Staff {
  if (!req.staff) throw new HttpError(401, 'Please sign in.');
  return req.staff;
}

export function requirePermission(req: Request, ...anyOf: Permission[]): Staff {
  const staff = me(req);
  if (!anyOf.some((p) => can(staff.role, p))) throw forbidden();
  return staff;
}

export function publicStaff(s: Staff) {
  const { keyHash: _h, keyLookupId: _l, tokenVersion: _t, ...rest } = s;
  return rest;
}

export function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
