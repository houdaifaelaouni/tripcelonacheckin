// Local / self-hosted entry point: API + the React app on one port.
// On Vercel, api/index.ts serves the API and the static build serves the app.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApi } from './server/app.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const portArg = process.argv.indexOf('--port');
const PORT = Number(portArg > -1 ? process.argv[portArg + 1] : process.env.PORT || 3000);

async function main() {
  const app = createApi();

  if (process.env.NODE_ENV === 'production') {
    const dist = path.join(root, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tripcelona running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
