// ─── Vercel serverless entry ─────────────────────────────────────────────────
// Runs the exact same Hono society (server/index.ts exports `app`) as one Node
// function so /api/* works on Vercel. The built React SPA is served as static files
// by Vercel's CDN (see vercel.json). The production target remains Docker on Alibaba
// Cloud ECS/SAS (a persistent process, where the human question and the NDJSON record
// share one instance); on serverless the record dir is HEARSAY_DATA_DIR=/tmp.
import { handle } from 'hono/vercel';
import { app } from '../server/index.js';

export const config = { runtime: 'nodejs' };

export default handle(app);
