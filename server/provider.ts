// ─── The CourtProvider seam ──────────────────────────────────────────────────
// The orchestrator (the Clerk's proceeding) talks only to this interface, so the
// exact same trial code runs whether the society is powered by live Qwen models or
// the deterministic demo engine. `isLive()` decides which implementation the factory
// returns; the demo path is clearly labelled everywhere it surfaces.

import type {
  Argument, Docket, FairPath, HumanQuestion, JurorLens, ProceedingStep, Side,
  Vote, VerdictCategory, Exhibit,
} from '../shared/types.js';
import { isLive } from './config.js';
import { QwenCourt } from './qwen-court.js';
import { DemoCourt } from './demo-court.js';

export interface JuryOpts {
  /** re-poll after deliberation (captures vote-changes) */
  repoll?: boolean;
  priorVotes?: Vote[];
  round: number;
}

export interface CourtProvider {
  readonly live: boolean;

  /** Clerk (qwen3.7-max): decompose the mess into a case record. */
  file(story: string, absentName: string): Promise<{ docket: Docket; steps: ProceedingStep[]; tokens: number }>;

  /** Counsel for You / for the Absent (qwen3.6-flash): one-sided, opposed mandates. */
  argue(side: Side, story: string, docket: Docket, prior: Argument[], round: number): Promise<{ text: string; tokens: number }>;

  /** Cross-examiner (qwen3.7-plus + web): ground a contested norm; surface a pivotal unknown. */
  cross(story: string, docket: Docket, args: Argument[]): Promise<{ exhibit?: Exhibit; pivotal?: HumanQuestion; tokens: number }>;

  /** The Jury (qwen3.7-plus, structured output): typed votes per value-lens. */
  jury(lenses: JurorLens[], story: string, docket: Docket, args: Argument[], opts: JuryOpts): Promise<{ votes: Vote[]; tokens: number }>;

  /** One juror, genuinely moved by an argument, changes their vote on the record. */
  deliberate(story: string, docket: Docket, args: Argument[], votes: Vote[]): Promise<{ text: string; change?: { jurorId: string; from: VerdictCategory; to: VerdictCategory; reason: string }; tokens: number }>;

  /** The Fair Path Forward (the one honest repair each side could make) + a shareable line. */
  repair(story: string, docket: Docket, category: VerdictCategory): Promise<{ fairPath: FairPath; oneLiner: string; tokens: number }>;

  /** A condensed file+vote pass used by the Bench's consistency checks. */
  quickVerdict(story: string, lenses: JurorLens[], absentName: string): Promise<{ votes: Vote[]; tokens: number }>;

  /** The same events, faithfully re-narrated from the other party's chair (POV-flip). */
  mirror(story: string, absentName: string): Promise<{ story: string; tokens: number }>;

  /** The single-agent baseline: one qwen3.7-max agent judges; it flatters the narrator. */
  solo(story: string, narrator: Side): Promise<{ verdict: VerdictCategory; quote: string; tokens: number }>;

  /** Read a real screenshot of the argument into the case record (qwen3-vl). */
  readScreenshot(imageDataUrl: string): Promise<{ story: string; tokens: number }>;
}

let cached: CourtProvider | null = null;
let cachedLive: boolean | null = null;

export function getProvider(): CourtProvider {
  const live = isLive();
  if (cached && cachedLive === live) return cached;
  cached = live ? new QwenCourt() : new DemoCourt();
  cachedLive = live;
  return cached;
}
