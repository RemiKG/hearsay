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
}

/** The deterministic Bench's ruling — LLM proposes, the tally disposes. */
export interface Verdict {
  category: VerdictCategory;
  counts: Record<VerdictCategory, number>;
  /** the head-to-head split, e.g. "5-2" (winner first) */
  split: string;
  jurors: number;
  moved: number;
  /** 0..1 — how decisive; drives calibration language */
  margin: number;
  calibration: string;
  fairPath: FairPath;
  headline: string; // e.g. "Not the asshole — five to two."
  oneLiner: string; // the shareable line
}

export interface ConsistencyCheck {
  agreement: number; // 0..1 (1.0 = the verdict held across the flip)
  a: VerdictCategory; // this telling
  b: VerdictCategory; // the mirrored / swapped telling
  held: boolean;
  detail: string;
}

export interface Consistency {
  povFlip: ConsistencyCheck;
  biasSwap: ConsistencyCheck;
}

export interface SoloTelling {
  narrator: Side;
  verdict: VerdictCategory;
  quote: string;
}

/** The single-agent baseline, run live on the same input. */
export interface SoloResult {
  tellings: SoloTelling[];
  flipped: boolean;
  povFlip: number; // 0..1
  model: string;
}

export interface Gauge {
  status: string; // FILING | ARGUING | CROSS | DELIBERATING | PAUSED | RULED
  round: number;
  roundsEst: number;
  tokens: number;
  jurors: number;
  moved: number;
}

/** Whether the live engine is on, and how it is wired. Surfaced honestly in the UI. */
export interface EngineInfo {
  /** true when a real DASHSCOPE_API_KEY backs the society */
  live: boolean;
  provider: 'qwen' | 'demo';
  baseUrl: string;
  models: Record<string, string>;
  grounding: string;
  comms: { telegram: boolean; email: boolean };
  note: string;
}

// ─── The streamed / recorded event union ────────────────────────────────────
interface Base {
  ts: number;
  /** monotonic sequence number within a case record */
  seq?: number;
}

export type CourtEvent =
  | (Base & { t: 'case_opened'; caseId: string; title: string; mode: InputMode; narrator: Side; demo: boolean })
  | (Base & { t: 'status'; gauge: Gauge })
  | (Base & { t: 'filing'; docket: Docket; steps: ProceedingStep[] })
  | (Base & { t: 'argument'; arg: Argument })
  | (Base & { t: 'objection'; by: string; text: string })
  | (Base & { t: 'exhibit'; exhibit: Exhibit })
  | (Base & { t: 'deliberation'; who: string; text: string; tone?: 'ochre' | 'slate' | 'moved' | 'ink' })
  | (Base & { t: 'vote'; vote: Vote })
  | (Base & { t: 'vote_change'; change: VoteChange })
  | (Base & { t: 'human_question'; question: HumanQuestion })
  | (Base & { t: 'human_answer'; answer: string })
  | (Base & { t: 'verdict'; verdict: Verdict })
  | (Base & { t: 'consistency'; consistency: Consistency })
  | (Base & { t: 'solo'; solo: SoloResult })
  | (Base & { t: 'note'; text: string; level?: 'info' | 'honest' | 'warn' })
  | (Base & { t: 'done'; caseId: string; paused?: boolean; resumeToken?: string })
  | (Base & { t: 'error'; message: string });

export type CourtEventType = CourtEvent['t'];

// ─── Docket cards, suite, metrics ───────────────────────────────────────────

export interface DocketCard {
  id: string;
  title: string;
  blurb: string;
  verdict: string; // e.g. "NTA · 5–2"
  date: string;
  example: boolean;
  faces: [number, number]; // sketch seeds for the two mini busts (warm, cool)
}

export interface SuiteCase {
  id: string;
  title: string;
  category: 'relationship' | 'family' | 'roommate' | 'workplace' | 'money';
  story: string;
  /** known crowd-consensus label (the proxy, disclosed small-N) */
  crowd: VerdictCategory;
  absentName: string;
}

export interface SuiteRow {
  id: string;
  title: string;
  crowd: VerdictCategory;
  courtA: VerdictCategory; // court, your telling
  courtB: VerdictCategory; // court, mirrored telling
  courtHeld: boolean;
  courtMatchesCrowd: boolean;
  soloA: VerdictCategory;
  soloB: VerdictCategory;
  soloHeld: boolean;
  soloMatchesCrowd: boolean;
}

export interface Metrics {
  povFlip: { court: number; solo: number };
  biasSwap: { court: number; solo: number };
  crowd: { court: number; solo: number; n: number };
  tokensSavedPct: number;
  roundsAvg: number;
  humanQuestionRate: string; // "1 in 6"
  live: boolean;
  source: 'live' | 'cached-demo';
}
