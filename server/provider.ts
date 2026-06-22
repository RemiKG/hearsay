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

  /** Clerk (qwen3.7-max + preserve_thinking): decompose the mess into a case record. */
  file(story: string, absentName: string): Promise<{ docket: Docket; steps: ProceedingStep[]; tokens: number }>;
