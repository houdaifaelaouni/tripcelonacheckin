// Cryptographic primitives: staff session tokens, personal access keys,
// and signed QR codes. Depends only on node:crypto so it can be unit-tested.
import crypto from 'node:crypto';
import type { Role } from '../shared/types';

const b64url = (buf: Buffer) => buf.toString('base64url');

function hmac(secret: string, data: string): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Unambiguous alphabet (no 0/O, 1/I/L) for codes humans may read aloud.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function newId(prefix: string, length = 10): string {
  return `${prefix}${randomCode(length)}`;
}

// ---------------------------------------------------------------------------
// Session tokens: <payload>.<signature>, payload = base64url(JSON)
// tv (token version) must match staff.tokenVersion, so revoking a key or
// deactivating someone logs out every device immediately.
// ---------------------------------------------------------------------------

export interface SessionPayload {
  sid: string; // staff id
  role: Role;
  tv: number; // token version
  exp: number; // epoch ms
}

export function signSession(secret: string, payload: SessionPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64url(hmac(secret, `session:${body}`))}`;
}

export function verifySession(secret: string, token: string, now = Date.now()): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  if (!safeEqual(sig, b64url(hmac(secret, `session:${body}`)))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Personal access keys: TCK-<lookupId>-<secret>
// lookupId is stored in plain text (to find the staff member); only a scrypt
// hash of the secret part is stored, so a database leak can't be used to log in.
// ---------------------------------------------------------------------------

export interface IssuedKey {
  key: string; // shown once to the owner
  lookupId: string;
  hash: string;
  hint: string;
}

export function issueAccessKey(): IssuedKey {
  const lookupId = randomCode(6);
  const secret = `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(secret, salt, 32);
  return {
    key: `TCK-${lookupId}-${secret}`,
    lookupId,
    hash: `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`,
    hint: secret.slice(-4),
  };
}

export function parseAccessKey(raw: string): { lookupId: string; secret: string } | null {
  const m = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .match(/^TCK-([A-Z0-9]{6})-([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/);
  return m ? { lookupId: m[1], secret: m[2] } : null;
}

export function verifyAccessKeySecret(secret: string, storedHash: string): boolean {
  const [scheme, saltB64, hashB64] = storedHash.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const derived = crypto.scryptSync(secret, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(derived, expected);
}

// ---------------------------------------------------------------------------
// Signed QR codes: TC1.<ticketId>.<sig>. The signature binds the ticket id to
// the server secret, so a pass can't be forged by guessing ids.
// ---------------------------------------------------------------------------

export function signTicketCode(secret: string, ticketId: string): string {
  const sig = b64url(hmac(secret, `ticket:${ticketId}`)).slice(0, 16);
  return `TC1.${ticketId}.${sig}`;
}

/** Accepts the raw code or a pass URL containing it. Returns the ticket id if the signature is valid. */
export function verifyTicketCode(secret: string, scanned: string): string | null {
  const match = scanned.trim().match(/TC1\.([A-Z0-9]{6,20})\.([A-Za-z0-9_-]{16})/);
  if (!match) return null;
  const [, ticketId, sig] = match;
  const expected = b64url(hmac(secret, `ticket:${ticketId}`)).slice(0, 16);
  return safeEqual(sig, expected) ? ticketId : null;
}
