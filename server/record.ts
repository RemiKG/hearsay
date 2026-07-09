// ─── The append-only NDJSON court record ────────────────────────────────────
// Every filing / argument / objection / vote / vote-change / verdict is appended,
// timestamped, one JSON object per line. The record IS the transcript, the replay,
// and the audit trail. Stored on the instance filesystem under .data/records.

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CourtEvent, DocketCard } from '../shared/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The record dir is overridable so a serverless host (e.g. Vercel) can point it at a
// writable temp dir; the Docker/ECS production target uses the default under the repo.
const DIR = process.env.HEARSAY_DATA_DIR || path.join(ROOT, '.data', 'records');

async function ensure() { await fs.mkdir(DIR, { recursive: true }); }
const recPath = (id: string) => path.join(DIR, `${safe(id)}.ndjson`);
const statePath = (id: string) => path.join(DIR, `${safe(id)}.state.json`);
function safe(id: string) { return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'case'; }

let seq = new Map<string, number>();

export async function appendEvent(caseId: string, ev: CourtEvent): Promise<void> {
  await ensure();
  const n = (seq.get(caseId) ?? 0) + 1;
  seq.set(caseId, n);
  (ev as any).seq = n;
  await fs.appendFile(recPath(caseId), JSON.stringify(ev) + '\n', 'utf8');
}

export async function readRecord(caseId: string): Promise<CourtEvent[]> {
  try {
    const txt = await fs.readFile(recPath(caseId), 'utf8');
    return txt.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as CourtEvent[];
  } catch { return []; }
}

export function recordExists(caseId: string): boolean { return existsSync(recPath(safe(caseId))); }

export async function saveState(caseId: string, state: unknown): Promise<void> {
  await ensure();
  await fs.writeFile(statePath(caseId), JSON.stringify(state), 'utf8');
}
export async function loadState<T = any>(caseId: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(statePath(caseId), 'utf8')) as T; } catch { return null; }
}
export async function clearState(caseId: string): Promise<void> {
  try { await fs.unlink(statePath(caseId)); } catch { /* ignore */ }
}

/** Build Docket cards for every decided case on disk (newest first). */
export async function listDecided(): Promise<DocketCard[]> {
  await ensure();
  let files: string[] = [];
  try { files = (await fs.readdir(DIR)).filter((f) => f.endsWith('.ndjson')); } catch { return []; }
  const cards: Array<DocketCard & { _mtime: number }> = [];
  for (const f of files) {
    const id = f.replace(/\.ndjson$/, '');
    const evs = await readRecord(id);
    const opened = evs.find((e) => e.t === 'case_opened') as any;
    const verdict = [...evs].reverse().find((e) => e.t === 'verdict') as any;
    if (!opened || !verdict) continue;
    const stat = await fs.stat(recPath(id)).catch(() => null);
    cards.push({
      id,
      title: opened.title || 'A case',
      blurb: '',
      verdict: `${verdict.verdict.category} · ${verdict.verdict.split.replace('-', '–')}`,
      date: new Date(opened.ts).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      example: false,
      faces: [31, 44],
      _mtime: stat?.mtimeMs || opened.ts,
    });
  }
  cards.sort((a, b) => b._mtime - a._mtime);
  return cards.map(({ _mtime, ...c }) => c);
}
