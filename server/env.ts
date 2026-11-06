import 'dotenv/config';
import type { StripeSlot } from '../shared/types';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  isProd: process.env.NODE_ENV === 'production',

  // Signs staff sessions. Long random string; rotating it logs everyone out.
  get sessionSecret() {
    return required('SESSION_SECRET');
  },
  // Signs QR codes on boarding passes. Rotating it invalidates every issued pass.
  get qrSecret() {
    return required('QR_SECRET');
  },

  // Comma-separated Google emails allowed to bootstrap as Owner.
  ownerEmails: (process.env.OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  // Firebase Admin service account JSON (raw JSON or base64). Falls back to
  // Application Default Credentials when unset (e.g. on Google Cloud).
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',

  stripe: {
    1: { secretKey: process.env.STRIPE_SECRET_KEY_1 || '', webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_1 || '' },
    2: { secretKey: process.env.STRIPE_SECRET_KEY_2 || '', webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_2 || '' },
  } as Record<StripeSlot, { secretKey: string; webhookSecret: string }>,

  // Optional transactional email via Resend (https://resend.com).
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Tripcelona <tickets@tripcelona.com>',

  sessionHours: Number(process.env.SESSION_HOURS || 24 * 14),
};
