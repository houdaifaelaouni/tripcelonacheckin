import express from 'express';
import { errorHandler, requireAuth } from './http';
import { publicRouter, webhookRouter } from './routes/public';
import { authRouter } from './routes/auth';
import { tripsRouter } from './routes/trips';
import { bookingsRouter, ticketsRouter } from './routes/bookings';
import { checkinRouter } from './routes/checkin';
import { staffRouter, partnersRouter, settingsRouter } from './routes/admin';
import { reportsRouter } from './routes/reports';

export function createApi() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // Webhooks need the raw body, so they're mounted before the JSON parser.
  app.use('/api/webhooks', webhookRouter);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);

  // Everything below requires a signed-in staff member.
  app.use('/api', requireAuth);
  app.use('/api/trips', tripsRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/checkin', checkinRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/partners', partnersRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/reports', reportsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);
  return app;
}
