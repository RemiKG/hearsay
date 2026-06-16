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
