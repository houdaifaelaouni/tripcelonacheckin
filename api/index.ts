// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
import { createApi } from '../server/app.js';

const app = createApi();
export default app;

// Stripe webhooks need the raw request body.
export const config = { api: { bodyParser: false } };
