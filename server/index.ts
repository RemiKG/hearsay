// ─── Hearsay server — one origin serves the SPA and the whole society API ────
// In production this single Node process serves the built client AND the API (ideal
// for a Docker container on Alibaba Cloud ECS/SAS). In dev, Vite serves the client
// and proxies /api here. Client code only ever calls relative /api/* — no hardcoded
// hosts or ports anywhere.

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG, engineInfo } from './config.js';
import { runTrial, resumeTrial, runSolo, type Emit } from './orchestrator.js';
import { readRecord, listDecided } from './record.js';
import { getMetrics, getSuiteRows } from './suite.js';
import { deliverVerdictCard, sendInvite } from './comms.js';
import { EXAMPLE_CARDS, INTAKE_EXAMPLES } from '../shared/examples.js';
import { SUITE } from '../shared/suite.js';
import { JURORS } from '../shared/lenses.js';
import type { CaseInput, CourtEvent } from '../shared/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const app = new Hono();
app.use('/api/*', cors());

const rid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const exampleStory = (id: string) => SUITE.find((s) => s.id === id);

// ── meta ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ ok: true, engine: engineInfo() }));
app.get('/api/engine', (c) => c.json(engineInfo()));
app.get('/api/examples', (c) => c.json({
  cards: EXAMPLE_CARDS,
  intake: INTAKE_EXAMPLES,
  stories: Object.fromEntries(EXAMPLE_CARDS.map((e) => [e.id, exampleStory(e.id)])),
}));
app.get('/api/jurors', (c) => c.json(JURORS));
app.get('/api/suite', (c) => c.json({ cases: SUITE.map(({ story, ...s }) => s), rows: getSuiteRows() }));
app.get('/api/metrics', (c) => c.json(getMetrics()));
app.get('/api/docket', async (c) => c.json({ decided: await listDecided(), examples: EXAMPLE_CARDS }));

app.get('/api/record/:id', async (c) => {
  const evs = await readRecord(c.req.param('id'));
  if (c.req.query('format') === 'ndjson') return c.text(evs.map((e) => JSON.stringify(e)).join('\n'), 200, { 'content-type': 'application/x-ndjson' });
  return c.json({ id: c.req.param('id'), events: evs });
});

// ── the trial (streamed) ─────────────────────────────────────────────────────
function inputFrom(body: any): CaseInput {
  return {
    story: String(body?.story || ''),
    mode: (['type', 'paste', 'screenshot'].includes(body?.mode) ? body.mode : 'type'),
    absentName: body?.absentName ? String(body.absentName) : undefined,
    inviteOptIn: !!body?.inviteOptIn,
    absentSide: body?.absentSide ? String(body.absentSide) : undefined,
    imageDataUrl: body?.imageDataUrl ? String(body.imageDataUrl) : undefined,
    narrator: body?.narrator === 'absent' ? 'absent' : 'you',
  };
}

app.post('/api/trial', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  let input = inputFrom(body);
  if (body?.exampleId) { const ex = exampleStory(String(body.exampleId)); if (ex) input = { ...input, story: ex.story, absentName: ex.absentName }; }
  const caseId = String(body?.caseId || rid());
  const panelSize = Number(body?.panelSize || 7);
  if (!input.story && input.mode !== 'screenshot') return c.json({ error: 'empty story' }, 400);

  return streamSSE(c, async (stream) => {
    const emit: Emit = async (ev: CourtEvent) => { await stream.writeSSE({ data: JSON.stringify(ev), event: ev.t }); };
    await stream.writeSSE({ data: JSON.stringify({ t: 'hello', ts: Date.now(), caseId }), event: 'hello' });
    try { await runTrial({ caseId, input, panelSize, emit }); }
    catch (e: any) { await emit({ t: 'error', ts: Date.now(), message: e?.message || 'trial error' }); }
  });
});

app.post('/api/trial/:id/resume', async (c) => {
  const caseId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const answer = String(body?.answer || 'No');
  return streamSSE(c, async (stream) => {
    const emit: Emit = async (ev: CourtEvent) => { await stream.writeSSE({ data: JSON.stringify(ev), event: ev.t }); };
    try { await resumeTrial({ caseId, answer, emit }); }
    catch (e: any) { await emit({ t: 'error', ts: Date.now(), message: e?.message || 'resume error' }); }
  });
});

// ── the single-agent baseline (the proof) ────────────────────────────────────
app.post('/api/solo', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  let input = inputFrom(body);
  if (body?.exampleId) { const ex = exampleStory(String(body.exampleId)); if (ex) input = { ...input, story: ex.story, absentName: ex.absentName }; }
  try { return c.json(await runSolo(input)); }
  catch (e: any) { return c.json({ error: e?.message || 'solo error' }, 500); }
});

// ── comms-MCP delivery (verdict card + invite) ───────────────────────────────
app.post('/api/comms/verdict', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const r = await deliverVerdictCard({ channel: b?.channel === 'email' ? 'email' : 'telegram', to: String(b?.to || ''), title: String(b?.title || 'A case'), verdict: String(b?.verdict || ''), oneLiner: String(b?.oneLiner || ''), link: b?.link });
  return c.json(r);
});
app.post('/api/comms/invite', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const r = await sendInvite({ channel: b?.channel === 'email' ? 'email' : 'telegram', to: String(b?.to || ''), link: String(b?.link || '') });
  return c.json(r);
});

// ── static SPA (production) ──────────────────────────────────────────────────
if (existsSync(DIST)) {
  app.use('/*', serveStatic({ root: path.relative(process.cwd(), DIST) || '.' }));
  const indexHtml = existsSync(path.join(DIST, 'index.html')) ? readFileSync(path.join(DIST, 'index.html'), 'utf8') : '';
  app.get('*', (c) => c.html(indexHtml)); // SPA fallback
}

const port = CONFIG.port;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`⚖  Hearsay listening on http://localhost:${info.port}  (engine: ${engineInfo().provider})`);
});
