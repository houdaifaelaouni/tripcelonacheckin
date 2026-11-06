// Firebase Admin: the ONLY way the app touches Firestore. Firestore rules deny
// all direct client access, so every read/write goes through this server.
import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { env } from './env.js';

function parseServiceAccount(raw: string) {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(text);
}

function initApp(): App {
  if (getApps().length) return getApps()[0];
  const credential = env.firebaseServiceAccount
    ? cert(parseServiceAccount(env.firebaseServiceAccount))
    : applicationDefault();
  return initializeApp({ credential, projectId: firebaseConfig.projectId });
}

const app = initApp();

export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const adminAuth = getAuth(app);

export const col = {
  partners: () => db.collection('partners'),
  staff: () => db.collection('staff'),
  trips: () => db.collection('trips'),
  seats: (tripId: string) => db.collection('trips').doc(tripId).collection('seats'),
  bookings: () => db.collection('bookings'),
  tickets: () => db.collection('tickets'),
  auditLog: () => db.collection('auditLog'),
};

export const nowIso = () => new Date().toISOString();

/** Record who did what. Best-effort: never blocks the request. */
export function audit(actor: string, action: string, details: Record<string, unknown> = {}) {
  col
    .auditLog()
    .add({ actor, action, details, at: nowIso() })
    .catch((err) => console.warn('[audit] failed', err));
}
