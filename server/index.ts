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
