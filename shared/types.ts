// ─── Hearsay — the shared contract ──────────────────────────────────────────
// These types are the wire protocol between the Qwen society (server) and the
// living courtroom sketch (client). Every CourtEvent that streams over SSE is
// ALSO the exact line appended to the case's NDJSON court record — the transcript
// IS the audit trail. Nothing here is decorative; each event drives a beat on the
// page (a filing, an argument, a vote scratched-and-redrawn, the split-flap flip).

export type VerdictCategory = 'NTA' | 'YTA' | 'ESH' | 'NAH';

export const VERDICT_LABELS: Record<VerdictCategory, string> = {
  NTA: 'Not the asshole',
  YTA: "You're the asshole",
  ESH: 'Everyone sucks here',
  NAH: 'No assholes here',
};

/** Which chair a voice speaks from. `you` runs warm/ochre, `absent` runs cool/slate. */
export type Side = 'you' | 'absent';

export type InputMode = 'type' | 'paste' | 'screenshot';

/** A juror is a distinct moral lens — not a clone. */
export interface JurorLens {
  id: string;
  name: string;
  /** one-line description of the frame this juror reasons from */
  frame: string;
  /** seed for the deterministic sketch face + optional face config */
  seed: number;
  face?: Record<string, unknown>;
}

/** The raw thing a stranger supplies. Re-runnable: a case is (mostly) its inputs. */
export interface CaseInput {
  /** the conflict, first person */
  story: string;
  mode: InputMode;
  /** optional label for the other party (defaults to "the other party") */
  absentName?: string;
  /** did the user send the opt-in "tell your side" link? */
  inviteOptIn?: boolean;
  /** if the absent party opted in and answered, their real account (never invented) */
  absentSide?: string;
  /** a data: URL of a screenshot to read with qwen3-vl (screenshot mode) */
  imageDataUrl?: string;
  /** for the impartiality checks: which telling this run represents */
  narrator?: Side;
}

/** The Clerk's decomposition — task division, made legible (screen 02). */
export interface Docket {
  caseNo: string;
  title: string;
  parties: { you: string; absent: string };
  agreedFacts: string[];
  disputedFacts: string[];
  norms: string[];
  /** the real question before the court */
  question: string;
}

export interface ProceedingStep {
  n: number;
  label: string;
  owner: string;
  /** palette hint: 'ochre' | 'slate' | 'ink' */
  tone: 'ochre' | 'slate' | 'ink';
}

export interface Argument {
  side: Side;
  who: string;
  text: string;
  round: number;
  /** Counsel for the Absent is an imagined best case unless the party opted in. */
  imagined?: boolean;
}

export interface Exhibit {
  label: string;
  detail: string;
  source: string;
  tool: 'web_extractor' | 'web_search' | 'from-the-texts';
  free: boolean;
}

export interface Vote {
  jurorId: string;
  lens: string;
  verdict: VerdictCategory;
  confidence: number; // 0..1
  reason: string;
  round: number;
  /** true once this juror has been persuaded to change (rendered in sage). */
  moved?: boolean;
}

export interface VoteChange {
  jurorId: string;
  lens: string;
  from: VerdictCategory;
  to: VerdictCategory;
  reason: string;
}

export interface HumanQuestion {
  question: string;
  options: [string, string];
  why: string;
}

export interface FairPath {
  you: string;
  other: string;
