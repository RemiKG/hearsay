// ─── The proceeding — the Clerk chains the whole society in one sequence ─────
// This is the tool loop the design calls "the Clerk": file → open → cross-examine →
// (one human question, only on a genuine pivotal unknown) → deliberate + vote-change →
// the deterministic Bench rules → live POV-flip + bias-swap checks. Every beat is
// emitted as a CourtEvent (streamed over SSE and appended to the NDJSON record). The
// exact same code runs on the live Qwen society and the demo engine.

import type { Argument, CaseInput, CourtEvent, Docket, Gauge, Side, Vote, SoloResult } from '../shared/types.js';
import { getProvider } from './provider.js';
import { isLive } from './config.js';
import { rule, classify, consistency } from '../shared/bench.js';
import { panelOf } from '../shared/lenses.js';
import { biasSwapStory } from '../shared/transform.js';
import { appendEvent, saveState, loadState, clearState } from './record.js';

export type Emit = (ev: CourtEvent) => Promise<void> | void;

const now = () => Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// In demo mode we pace the stream so the court visibly deliberates round by round;
// live mode is already paced by model latency.
const pace = (ms: number) => (isLive() ? Promise.resolve() : sleep(ms));

interface RunState {
  story: string;
  absentName: string;
  narrator: Side;
  panelSize: number;
  docket: Docket;
  args: Argument[];
  tokens: number;
  demo: boolean;
}

function gaugeOf(status: string, round: number, tokens: number, jurors: number, moved: number): Gauge {
  return { status, round, roundsEst: 4, tokens, jurors, moved };
}

async function emitStatus(emit: Emit, g: Gauge) { await emit({ t: 'status', ts: now(), gauge: g }); }

/**
 * Phase A: file the case, hear the counsels, cross-examine. If a genuine pivotal
 * unknown surfaces, pause for the one human question and persist state. Otherwise
 * fall straight through to the verdict.
 */
export async function runTrial(opts: { caseId: string; input: CaseInput; panelSize?: number; emit: Emit }): Promise<{ paused: boolean }> {
  const provider = getProvider();
  const emit = wrap(opts.caseId, opts.emit);
  const panelSize = opts.panelSize ?? 7;
  const narrator: Side = opts.input.narrator ?? 'you';
  let tokens = 0;
  const jurors = panelOf(panelSize).length;

  // (0) screenshot → text via qwen3-vl (real inputs)
  let story = (opts.input.story || '').trim();
  if (opts.input.mode === 'screenshot' && opts.input.imageDataUrl) {
    const v = await provider.readScreenshot(opts.input.imageDataUrl);
    tokens += v.tokens; story = v.story || story;
    await emit({ t: 'note', ts: now(), text: provider.live ? 'Screenshot read by qwen3-vl.' : 'Screenshot reading is a live-key feature; using a demo reading.', level: 'honest' });
  }
  const absentName = opts.input.absentName || 'the other party';

  // (1) the Clerk files the case
  await emitStatus(emit, gaugeOf('FILING', 1, tokens, jurors, 0));
  const filed = await provider.file(story, absentName);
  tokens += filed.tokens;
