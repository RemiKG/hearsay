// ─── Vercel serverless entry ─────────────────────────────────────────────────
// Runs the exact same Hono society (server/index.ts exports `app`) as one Node
// function so /api/* works on Vercel. Vercel pre-parses the request body (consuming
// the raw stream), so we rebuild a Web Request from `req.body` before handing it to
// the fetch-style app, and stream the Response back chunk-by-chunk (SSE works). The
// built React SPA is served as static files by Vercel's CDN (see vercel.json). The
// production target remains Docker on Alibaba Cloud ECS/SAS (a persistent process,
// where the human question + the NDJSON record share one instance); on serverless the
// record dir is HEARSAY_DATA_DIR=/tmp.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../server/index.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost') as string;
  const proto = (req.headers['x-forwarded-proto'] || 'https') as string;
  const url = `${proto}://${host}${req.url || '/'}`;
  const method = (req.method || 'GET').toUpperCase();

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  }

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') body = req.body;
    else { body = JSON.stringify(req.body); if (!headers.has('content-type')) headers.set('content-type', 'application/json'); }
    headers.delete('content-length');
  }

  const response = await app.fetch(new Request(url, { method, headers, body }));

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
  }

  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}
