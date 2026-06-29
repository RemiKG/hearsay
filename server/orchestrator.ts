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
  await emit({ t: 'case_opened', ts: now(), caseId: opts.caseId, title: filed.docket.title, mode: opts.input.mode, narrator, demo: !provider.live });
  await emit({ t: 'note', ts: now(), text: provider.live ? 'Live Qwen Cloud society over your own input.' : 'Demo engine — arguments/votes are illustrative; the Bench, the record, and every number are real.', level: 'honest' });
  await emit({ t: 'filing', ts: now(), docket: filed.docket, steps: filed.steps });
  await pace(650);

  // (2) the counsels open
  await emitStatus(emit, gaugeOf('ARGUING', 2, tokens, jurors, 0));
  const args: Argument[] = [];
  const you = await provider.argue('you', story, filed.docket, args, 1);
  tokens += you.tokens; args.push({ side: 'you', who: 'Counsel for You', text: you.text, round: 1 });
  await emit({ t: 'argument', ts: now(), arg: args[args.length - 1] }); await pace(700);

  const absent = await provider.argue('absent', story, filed.docket, args, 1);
  tokens += absent.tokens; args.push({ side: 'absent', who: 'Counsel for the Absent', text: absent.text, round: 1, imagined: !opts.input.absentSide });
  await emit({ t: 'argument', ts: now(), arg: args[args.length - 1] }); await pace(700);

  // (3) the Cross-examiner grounds a fact + maybe surfaces the pivotal unknown
  await emitStatus(emit, gaugeOf('CROSS', 3, tokens, jurors, 0));
  const cross = await provider.cross(story, filed.docket, args);
  tokens += cross.tokens;
  if (cross.exhibit) { await emit({ t: 'exhibit', ts: now(), exhibit: cross.exhibit }); await pace(700); }

  const state: RunState = { story, absentName, narrator, panelSize, docket: filed.docket, args, tokens, demo: !provider.live };

  if (cross.pivotal) {
    await emit({ t: 'human_question', ts: now(), question: cross.pivotal });
    await emitStatus(emit, gaugeOf('PAUSED', 3, tokens, jurors, 0));
    await saveState(opts.caseId, state);
    await emit({ t: 'done', ts: now(), caseId: opts.caseId, paused: true, resumeToken: opts.caseId });
    return { paused: true };
  }

  await runVerdict(opts.caseId, state, emit);
  return { paused: false };
}

/** Resume after the one human answer, straight into deliberation + verdict. */
export async function resumeTrial(opts: { caseId: string; answer: string; emit: Emit }): Promise<void> {
  const emit = wrap(opts.caseId, opts.emit);
  const state = await loadState<RunState>(opts.caseId);
  if (!state) { await emit({ t: 'error', ts: now(), message: 'no paused trial to resume' }); return; }
  await emit({ t: 'human_answer', ts: now(), answer: opts.answer });
  // fold the answer into the record so the jury weighs it (deed still judged, not telling)
  state.story = `${state.story}\n[The court asked the narrator a pivotal question; the answer on the record was: ${opts.answer}.]`;
  await clearState(opts.caseId);
  await runVerdict(opts.caseId, state, emit);
}

/** Phase B: deliberate, capture a vote-change, let the Bench rule, run the impartiality checks. */
async function runVerdict(caseId: string, state: RunState, emit: Emit): Promise<void> {
  const provider = getProvider();
  const lenses = panelOf(state.panelSize);
  let tokens = state.tokens;
  const jurors = lenses.length;

  await emitStatus(emit, gaugeOf('DELIBERATING', 4, tokens, jurors, 0));
  const juryRes = await provider.jury(lenses, state.story, state.docket, state.args, { round: 4 });
  tokens += juryRes.tokens;
  let votes: Vote[] = juryRes.votes;
  for (const v of votes) { await emit({ t: 'vote', ts: now(), vote: v }); await pace(160); }
  await pace(500);

  // deliberation — a juror is moved on the record
  const delib = await provider.deliberate(state.story, state.docket, state.args, votes);
  tokens += delib.tokens;
  await emit({ t: 'deliberation', ts: now(), who: 'the jury', text: delib.text, tone: 'moved' });
  let moved = 0;
