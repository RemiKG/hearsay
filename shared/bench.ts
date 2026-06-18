// ─── The deterministic Bench (non-LLM) ──────────────────────────────────────
// "LLM proposes; the tally disposes." Everything in this file is plain arithmetic
// over the jury's typed votes. It runs identically with or without a Qwen key — it
// is the un-fakeable spine the design promises. No model ever decides the category,
// the split, the calibration, or whether the verdict held under a narrator-swap;
// this code does, from the votes alone.

import type {
  VerdictCategory,
  Vote,
  Verdict,
  FairPath,
  ConsistencyCheck,
  Consistency,
  SuiteRow,
  Metrics,
} from './types.js';

export const CATEGORIES: VerdictCategory[] = ['NTA', 'YTA', 'ESH', 'NAH'];

const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Tally raw juror votes into per-category counts. */
export function tally(votes: Vote[]): Record<VerdictCategory, number> {
  const counts: Record<VerdictCategory, number> = { NTA: 0, YTA: 0, ESH: 0, NAH: 0 };
  for (const v of votes) counts[v.verdict] = (counts[v.verdict] ?? 0) + 1;
  return counts;
}

/** Sum of confidence per category — used only as a deterministic tie-break. */
function confidenceByCategory(votes: Vote[]): Record<VerdictCategory, number> {
  const c: Record<VerdictCategory, number> = { NTA: 0, YTA: 0, ESH: 0, NAH: 0 };
  for (const v of votes) c[v.verdict] += Math.max(0, Math.min(1, v.confidence || 0.5));
  return c;
}

export interface Classification {
  category: VerdictCategory;
  split: string;
  jurors: number;
  margin: number; // (winner - runnerUp) / jurors, 0..1
  winnerCount: number;
  runnerUpCount: number;
}

/**
 * Decide the category by plurality of the jury. Ties are broken deterministically
 * by summed confidence, then by a fixed category order — never by a model's mood.
 */
export function classify(votes: Vote[]): Classification {
  const counts = tally(votes);
  const conf = confidenceByCategory(votes);
  const jurors = votes.length || 1;
  const ranked = [...CATEGORIES].sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    if (Math.abs(conf[b] - conf[a]) > 1e-6) return conf[b] - conf[a];
    return CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b);
  });
  const category = ranked[0];
  const winnerCount = counts[category];
  const runnerUpCount = counts[ranked[1]] ?? 0;
  const split = `${winnerCount}-${runnerUpCount}`;
  const margin = Math.max(0, (winnerCount - runnerUpCount) / jurors);
  return { category, split, jurors, margin, winnerCount, runnerUpCount };
}

/** Calibration language derived purely from the vote margin. */
export function calibrationPhrase(margin: number): string {
  if (margin >= 0.6) return 'a clear call — the room barely wavered';
  if (margin >= 0.34) return 'a firm majority, but a real minority held out';
  if (margin >= 0.15) return 'a genuine split — this one was close';
  return 'a nail-biter — the court almost went the other way';
}

export function marginPct(margin: number): number {
  return Math.round(margin * 100);
}

function headlineFor(category: VerdictCategory, split: string): string {
  const [a, b] = split.split('-');
  const words = (n: string) => numberWords[Number(n)] ?? n;
  const phrase =
    category === 'NTA' ? 'Not the asshole' :
    category === 'YTA' ? "You're the asshole" :
    category === 'ESH' ? 'Everyone sucks here' :
    'No assholes here';
  return `${phrase} — ${words(a)} to ${words(b)}.`;
}

/**
 * Package a full ruling from the votes + the (LLM- or demo-proposed) repair. The
 * Bench owns every number here; only the prose of the Fair Path Forward and the
 * shareable one-liner are content the society supplies.
 */
export function rule(votes: Vote[], fairPath: FairPath, oneLiner: string): Verdict {
  const c = classify(votes);
  const moved = votes.filter((v) => v.moved).length;
  return {
    category: c.category,
    counts: tally(votes),
    split: c.split,
    jurors: c.jurors,
    moved,
    margin: c.margin,
    calibration: calibrationPhrase(c.margin),
    fairPath,
    headline: headlineFor(c.category, c.split),
    oneLiner,
  };
}

/** A single consistency check: did the verdict hold across a transformation of the input? */
export function consistencyCheck(a: VerdictCategory, b: VerdictCategory, detail: string): ConsistencyCheck {
  const held = a === b;
  return { agreement: held ? 1 : 0, a, b, held, detail };
}

export function consistency(
  povA: VerdictCategory,
  povB: VerdictCategory,
  biasA: VerdictCategory,
  biasB: VerdictCategory,
): Consistency {
  return {
    povFlip: consistencyCheck(
      povA,
      povB,
      povA === povB
        ? 'Same events, told from the other chair — the Bench judged the deed, not the accent.'
        : 'The telling changed the verdict — a failure the court is built to prevent.',
    ),
    biasSwap: consistencyCheck(
      biasA,
      biasB,
      biasA === biasB
        ? 'Names, gender, and role were swapped; the verdict did not move.'
        : 'An incidental identity swap moved the verdict — a fairness failure.',
    ),
  };
}

// ─── Aggregate metrics over the seeded suite (pure functions) ───────────────

function rate(hits: number, n: number): number {
  return n === 0 ? 0 : Math.round((hits / n) * 100) / 100;
}

export function povFlipRate(rows: SuiteRow[], who: 'court' | 'solo'): number {
  const held = rows.filter((r) => (who === 'court' ? r.courtHeld : r.soloHeld)).length;
  return rate(held, rows.length);
}

export function crowdAgreementRate(rows: SuiteRow[], who: 'court' | 'solo'): number {
  const hit = rows.filter((r) => (who === 'court' ? r.courtMatchesCrowd : r.soloMatchesCrowd)).length;
  return rate(hit, rows.length);
}

/**
 * Assemble the headline metrics from suite rows + measured token/round telemetry.
 * bias-swap figures are supplied (they use the same held/flip machinery on the
 * identity-swapped runs) so this stays a pure function of its inputs.
 */
export function assembleMetrics(args: {
  rows: SuiteRow[];
  biasSwap: { court: number; solo: number };
  tokensSavedPct: number;
  roundsAvg: number;
  humanQuestionRate: string;
  live: boolean;
  source: 'live' | 'cached-demo';
}): Metrics {
  return {
    povFlip: {
      court: Math.round(povFlipRate(args.rows, 'court') * 100),
      solo: Math.round(povFlipRate(args.rows, 'solo') * 100),
    },
    biasSwap: args.biasSwap,
    crowd: {
      court: Math.round(crowdAgreementRate(args.rows, 'court') * 100),
      solo: Math.round(crowdAgreementRate(args.rows, 'solo') * 100),
      n: args.rows.length,
    },
    tokensSavedPct: args.tokensSavedPct,
    roundsAvg: args.roundsAvg,
    humanQuestionRate: args.humanQuestionRate,
    live: args.live,
    source: args.source,
  };
}
