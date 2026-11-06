import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = 3000;
const portArgIndex = process.argv.indexOf('--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  PORT = parseInt(process.argv[portArgIndex + 1], 10);
}

// Initialize Firebase SDK in Node
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Read Stripe Secrets from Environment Variables ONLY
const STRIPE_SECRET_KEY_1 = process.env.STRIPE_SECRET_KEY_1 || '';
const STRIPE_WEBHOOK_SECRET_1 = process.env.STRIPE_WEBHOOK_SECRET_1 || '';
const STRIPE_SECRET_KEY_2 = process.env.STRIPE_SECRET_KEY_2 || '';
const STRIPE_WEBHOOK_SECRET_2 = process.env.STRIPE_WEBHOOK_SECRET_2 || '';

// Initialize Stripe Client Instances (if keys present)
const stripe1 = STRIPE_SECRET_KEY_1 ? new Stripe(STRIPE_SECRET_KEY_1) : null;
const stripe2 = STRIPE_SECRET_KEY_2 ? new Stripe(STRIPE_SECRET_KEY_2) : null;

function getStripeClient(account: number | string): { client: Stripe; webhookSecret: string } | null {
  const accNum = Number(account);
  if (accNum === 1) {
    if (!stripe1) return null;
    return { client: stripe1, webhookSecret: STRIPE_WEBHOOK_SECRET_1 };
  }
  if (accNum === 2) {
    if (!stripe2) return null;
    return { client: stripe2, webhookSecret: STRIPE_WEBHOOK_SECRET_2 };
  }
  return null;
}

function getAppUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// ----------------------------------------------------------------------
// 1. STRIPE WEBHOOKS (Must be registered BEFORE express.json())
// ----------------------------------------------------------------------
app.post(
  '/api/webhooks/stripe/:account',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const { account } = req.params;
    const accNum = Number(account);

    if (accNum !== 1 && accNum !== 2) {
      console.warn(`[Stripe Webhook] Invalid account param: ${account}`);
      return res.status(400).send(`Invalid account: ${account}`);
    }

    const stripeInfo = getStripeClient(accNum);
    if (!stripeInfo) {
      console.warn(`[Stripe Webhook] Stripe account ${accNum} is not configured.`);
      return res.status(500).send(`Stripe account ${accNum} is not configured with secret key.`);
    }

    const sig = req.headers['stripe-signature'];
    if (!sig || !stripeInfo.webhookSecret) {
      console.warn(`[Stripe Webhook] Missing signature or webhook secret for account ${accNum}`);
      return res.status(400).send('Missing stripe-signature header or webhook secret.');
    }

    let event: Stripe.Event;
    try {
      event = stripeInfo.client.webhooks.constructEvent(
        req.body,
        sig,
        stripeInfo.webhookSecret
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Stripe Webhook] Signature verification failed for account ${accNum}:`, msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }

    console.log(`[Stripe Webhook] Received ${event.type} for Account ${accNum}`);

    try {
      // Handle checkout session completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.metadata?.reservationId;

        if (reservationId) {
          const ticketRef = doc(db, 'tickets', reservationId);
          const ticketSnap = await getDoc(ticketRef);

          if (ticketSnap.exists()) {
            const current = ticketSnap.data();
            // Idempotent: Only update if not already marked paid
            if (current.paymentStatus !== 'paid') {
              const paymentIntentId = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null;
              const amountPaid = session.amount_total ? session.amount_total / 100 : (current.amountPaid || 25);

              await updateDoc(ticketRef, {
                paymentStatus: 'paid',
                status: 'valid',
                stripeSessionId: session.id,
                paymentIntentId,
                amountPaid,
                stripeAccountUsed: accNum === 1 ? 'account_1' : 'account_2',
                stripeAccountLabel: `Stripe Account ${accNum}`,
                paidAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                emailDeliveryStatus: 'sent',
                whatsappDeliveryStatus: 'ready',
              });
              console.log(`[Stripe Webhook] Successfully marked ticket ${reservationId} as PAID (Account ${accNum})`);
            }
          } else {
            console.warn(`[Stripe Webhook] Reservation ${reservationId} not found in Firestore.`);
          }
        }
      } 
      // Handle checkout session expired (release held seat)
      else if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        const reservationId = session.metadata?.reservationId;

        if (reservationId) {
          const ticketRef = doc(db, 'tickets', reservationId);
          const ticketSnap = await getDoc(ticketRef);

          if (ticketSnap.exists()) {
            const current = ticketSnap.data();
            if (current.paymentStatus === 'pending') {
              await updateDoc(ticketRef, {
                status: 'cancelled',
                paymentStatus: 'cancelled',
                cancelledReason: 'checkout_expired',
                updatedAt: new Date().toISOString(),
              });
              console.log(`[Stripe Webhook] Released seat for expired reservation ${reservationId}`);
            }
          }
        }
      }

      return res.json({ received: true });
    } catch (err: unknown) {
      console.error('[Stripe Webhook] Error processing event:', err);
      return res.status(500).json({ error: 'Internal webhook handler error' });
    }
  }
);

// ----------------------------------------------------------------------
// 2. PARSE JSON FOR STANDARD API ROUTES
// ----------------------------------------------------------------------
app.use(express.json());

// Public config check: lets client know if Stripe accounts are configured without exposing keys
app.get('/api/config/accounts', (_req: Request, res: Response) => {
  res.json({
    account1Configured: Boolean(STRIPE_SECRET_KEY_1),
    account2Configured: Boolean(STRIPE_SECRET_KEY_2),
  });
});

// ----------------------------------------------------------------------
// 3. CREATE STRIPE CHECKOUT SESSION (POST /api/checkout)
// ----------------------------------------------------------------------
app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const { tripId, seat, name, email, whatsapp, account } = req.body;
    const accNum = Number(account);

    if (accNum !== 1 && accNum !== 2) {
      return res.status(400).json({ error: 'Invalid Stripe account specified. Must be 1 or 2.' });
    }

    const stripeInfo = getStripeClient(accNum);
    if (!stripeInfo) {
      return res.status(400).json({ 
        error: `Stripe Account ${accNum} is not configured on the server. Please add STRIPE_SECRET_KEY_${accNum} to environment variables.` 
      });
    }

    if (!tripId || !seat || !name || !email) {
      return res.status(400).json({ error: 'Missing required reservation fields: tripId, seat, name, email.' });
    }

    const seatNum = parseInt(seat, 10);
    if (isNaN(seatNum) || seatNum < 1) {
      return res.status(400).json({ error: 'Invalid seat number.' });
    }

    // 1. Validate trip exists in Firestore and retrieve official price
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) {
      return res.status(404).json({ error: 'Selected travel journey was not found in database.' });
    }

    const tripData = tripSnap.data();
    const capacity = tripData.capacity || 55;
    if (seatNum > capacity) {
      return res.status(400).json({ error: `Seat #${seatNum} exceeds vehicle capacity of ${capacity} places.` });
    }

    // Official trip price in EUR from database (Never trust price from client)
    const tripPrice = tripData.price !== undefined ? Math.max(1, Number(tripData.price)) : 25;

    // 2. Validate seat is free (Checking paid tickets and active pending holds < 15 min)
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('tripId', '==', tripId),
      where('seatNumber', '==', seatNum)
    );
    const existingTicketsSnap = await getDocs(ticketsQuery);
    const now = Date.now();
    const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes hold

    for (const ticketDoc of existingTicketsSnap.docs) {
      const t = ticketDoc.data();
      if (t.status === 'cancelled') continue;

      if (t.paymentStatus === 'paid') {
        return res.status(409).json({ error: `Seat #${seatNum} has already been reserved and paid for.` });
      }

      if (t.paymentStatus === 'pending') {
        const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        if (now - createdAt < HOLD_DURATION_MS) {
          return res.status(409).json({ 
            error: `Seat #${seatNum} is currently held by another pending checkout. Please pick another seat or try again in a few minutes.` 
          });
        }
      }
    }

    // 3. Create 'pending' reservation in Firestore
    const reservationId = `TC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const appUrl = getAppUrl(req);
    const expiresAt = new Date(now + HOLD_DURATION_MS).toISOString();

    const nameParts = String(name).trim().split(' ');
    const firstName = nameParts[0] || 'Passenger';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newReservation = {
      id: reservationId,
      tripId,
      firstName,
      lastName,
      destination: tripData.destination,
      seatNumber: seatNum,
      contactEmail: String(email).trim(),
      contactPhone: String(whatsapp || '').trim(),
      whatsappNumber: String(whatsapp || '').trim(),
      status: 'pending',
      paymentStatus: 'pending',
      amountPaid: tripPrice,
      stripeAccountUsed: accNum === 1 ? 'account_1' : 'account_2',
      stripeAccountLabel: `Stripe Account ${accNum}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      qrPayload: JSON.stringify({ ticketId: reservationId, tripId, seatNumber: seatNum }),
    };

    await setDoc(doc(db, 'tickets', reservationId), newReservation);

    // 4. Create real Stripe Checkout Session
    const unitAmountCents = Math.round(tripPrice * 100);
    const session = await stripeInfo.client.checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      customer_email: String(email).trim(),
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: unitAmountCents,
            product_data: {
              name: `${tripData.viajesNumber} · ${tripData.name} (Place #${seatNum})`,
              description: `Direct Coach to ${tripData.destination} | Origin: ${tripData.origin} | Date: ${tripData.date} at ${tripData.time || '08:00 AM'}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservationId,
        tripId,
        seat: String(seatNum),
        account: String(accNum),
      },
      success_url: `${appUrl}/book/${accNum}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book/${accNum}?cancelled=1`,
    });

    // Store stripeSessionId on the reservation
    await updateDoc(doc(db, 'tickets', reservationId), {
      stripeSessionId: session.id,
    });

    console.log(`[Stripe Checkout] Created session ${session.id} for reservation ${reservationId} (Account ${accNum})`);

    return res.json({
      url: session.url,
      reservationId,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Stripe Checkout Error]:', msg);
    return res.status(500).json({ error: msg || 'Failed to initialize Stripe checkout.' });
  }
});

// ----------------------------------------------------------------------
// 4. RETRIEVE CHECKOUT SESSION (GET /api/checkout/session)
// ----------------------------------------------------------------------
app.get('/api/checkout/session', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.id as string;
    const accountParam = req.query.account as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session id parameter.' });
    }

    let session: Stripe.Checkout.Session | null = null;
    let usedAccount = Number(accountParam) || 0;

    // Try specified account first
    if (usedAccount === 1 || usedAccount === 2) {
      const info = getStripeClient(usedAccount);
      if (info) {
        try {
          session = await info.client.checkout.sessions.retrieve(sessionId);
        } catch {
          session = null;
        }
      }
    }

    // Fallback: Check both accounts
    if (!session) {
      if (stripe1) {
        try {
          session = await stripe1.checkout.sessions.retrieve(sessionId);
          usedAccount = 1;
        } catch {}
      }
      if (!session && stripe2) {
        try {
          session = await stripe2.checkout.sessions.retrieve(sessionId);
          usedAccount = 2;
        } catch {}
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Stripe Checkout Session not found.' });
    }

    const reservationId = session.metadata?.reservationId;
    if (!reservationId) {
      return res.status(404).json({ error: 'No reservation ID associated with this session.' });
    }

    const ticketRef = doc(db, 'tickets', reservationId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
      return res.status(404).json({ error: 'Reservation ticket not found.' });
    }

    let ticket = ticketSnap.data();

    // Auto-confirm fallback: if Stripe says payment_status == 'paid' but webhook hasn't arrived
    if (session.payment_status === 'paid' && ticket.paymentStatus !== 'paid') {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;
      const amountPaid = session.amount_total ? session.amount_total / 100 : (ticket.amountPaid || 25);

      await updateDoc(ticketRef, {
        paymentStatus: 'paid',
        status: 'valid',
        stripeSessionId: session.id,
        paymentIntentId,
        amountPaid,
        stripeAccountUsed: usedAccount === 1 ? 'account_1' : 'account_2',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      ticket = {
        ...ticket,
        paymentStatus: 'paid',
        status: 'valid',
        stripeSessionId: session.id,
        paymentIntentId,
        amountPaid,
        stripeAccountUsed: usedAccount === 1 ? 'account_1' : 'account_2',
      };
    }

    // Retrieve trip details
    let trip = null;
    if (ticket.tripId) {
      const tripSnap = await getDoc(doc(db, 'trips', ticket.tripId));
      if (tripSnap.exists()) {
        trip = tripSnap.data();
      }
    }

    return res.json({
      paid: ticket.paymentStatus === 'paid',
      status: ticket.status,
      ticket,
      trip,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email || session.customer_email,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Retrieve Session Error]:', msg);
    return res.status(500).json({ error: msg || 'Failed to retrieve session.' });
  }
});

// ----------------------------------------------------------------------
// 5. VITE SPA MIDDLEWARE (Dev) OR STATIC SERVE (Production)
// ----------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tripcelona server running on http://0.0.0.0:${PORT}`);
});
