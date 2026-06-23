// ─── DemoCourt — the honest-degrade engine (no live Qwen key) ───────────────
// Deterministic and scenario-aware. It exercises the ENTIRE machinery — the
// streaming proceeding, the vote-change, the human question, the Bench, the NDJSON
// record, the impartiality computation — so a stranger sees a complete, coherent
// trial without any key. It is clearly labelled "demo engine" in the UI: the
// arguments and votes are illustrative, but the Bench math, the record, the
// consistency computation, and every on-screen number are real and computed here.
//
// Design intent it faithfully models:
//   • the court judges the DEED, so it HOLDS under a narrator-swap / bias-swap;
//   • a lone solo agent FLATTERS whoever narrates, so it FLIPS.

import type {
  Argument, Docket, FairPath, HumanQuestion, JurorLens, ProceedingStep, Side, Vote, VerdictCategory, Exhibit,
} from '../shared/types.js';
import type { CourtProvider, JuryOpts } from './provider.js';
import { STANDARD_STEPS } from './qwen-court.js';

type Cat = VerdictCategory;

// ── deterministic hashing over the DEED (identity/narration normalised away) ──
// Strips ALL person markers (first/second/third) + kin roles so the original, the
// narrator-swapped mirror, and the bias-swapped variant all normalise to the SAME
// deed — which is exactly why the court holds under the impartiality checks.
const IDENTITY = /\b(she|he|her|his|him|hers|herself|himself|they|them|their|theirs|themselves|i|me|my|mine|we|us|our|you|your|sister|brother|mother|father|mom|dad|mum|wife|husband|girlfriend|boyfriend|aunt|uncle|daughter|son)\b/gi;
function normalizeDeed(story: string): string {
  return story.toLowerCase().replace(IDENTITY, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// An honest char-based token ESTIMATE of the demo text (~4 chars/token) + a small
// per-call overhead, so the proceeding gauge ticks up plausibly without a live key.
// (With a key, real usage.total_tokens from Qwen replaces these.)
const est = (text: string, base = 60): number => base + Math.ceil((text || '').length / 4);
function rng(seed: number) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

// ── known example scripts (verdict + hero content matched to the mockups) ────
interface Script {
  verdict: Cat; runnerUp: Cat; mover: string;
  argYou: string; argAbsent: string;
  exhibit: { label: string; detail: string; source: string };
  pivotal?: { question: string; why: string };
  fairPath: FairPath; oneLiner: string; deliberation: string;
}
const SCRIPTS: Record<string, Script> = {
  s01: {
    verdict: 'NTA', runnerUp: 'YTA', mover: 'empath',
    argYou: 'She knew for weeks I had the launch. Four days’ notice, and I offered a make-up dinner. A scheduling conflict — not contempt.',
    argAbsent: 'Four days isn’t “weeks.” An engagement is a landmark, not a slot — what she heard was: the work mattered more than she did.',
    exhibit: { label: 'NOTICE GIVEN: 4 DAYS', detail: 'Four days’ notice was given before the dinner, per the texts.', source: 'from the texts' },
    pivotal: { question: 'Did you tell her — before the day — that you might not make it?', why: '“Yes” → the case turns on whether she acknowledged it. “No” → Counsel for the Absent gains real ground. Either way, the deed gets judged — not your telling of it.' },
    fairPath: { you: 'You weren’t the villain — but a two-line apology for the short notice ends this. Own the timing, not the choice.', other: 'She could own that a real work launch isn’t an excuse — and say plainly that what hurt was feeling second, not the absence.' },
    oneLiner: 'A jury that argued both sides says you’re NTA — and it landed the same from her chair, too.',
    deliberation: '…that moves me — changing my vote.',
  },
  s02: {
    verdict: 'YTA', runnerUp: 'NTA', mover: 'freespirit',
    argYou: 'The service was slow and I still left something. A tip is earned, not owed — I shouldn’t be shamed for a number.',
    argAbsent: 'Ten percent on polite, present service reads as a statement. She wasn’t defending the meal — she was defending the person carrying it.',
    exhibit: { label: 'CUSTOMARY TIP: ~18–20%', detail: 'A sit-down tip of roughly 18–20% is the widely expected norm for adequate service.', source: 'grounded norm' },
    fairPath: { you: 'Match the norm next time, or say your issue to a manager — not through the tip line.', other: 'She could raise it privately, not by quietly fixing it, which read as correcting you.' },
    oneLiner: 'The jury argued both sides and still lands YTA — the tip spoke louder than the service.',
    deliberation: 'Autonomy has limits when someone else absorbs the cost — I’m moving.',
  },
  s03: {
    verdict: 'ESH', runnerUp: 'YTA', mover: 'stickler',
    argYou: 'He did nothing for weeks. Why should his name ride on my all-nighters? The credits should mean something.',
    argAbsent: 'Cutting him silently, with no warning and no chance to fix it, is its own kind of contempt — you appointed yourself judge.',
    exhibit: { label: 'NO NOTICE GIVEN', detail: 'The teammate was removed from the credits without any prior warning or chance to contribute.', source: 'from the account' },
    fairPath: { you: 'Name the problem to him and the team before you act — process is the point of fairness.', other: 'He could own the coasting instead of only protesting the credit.' },
    oneLiner: 'Argued from both chairs: ESH — he coasted, but cutting him in silence was its own foul.',
    deliberation: 'The rule was broken on both sides — I have to move to ESH.',
  },
  s04: {
    verdict: 'NAH', runnerUp: 'ESH', mover: 'pragmatist',
    argYou: 'It was a joke to break a three-week stalemate, not an attack. Somebody had to lighten it.',
    argAbsent: 'Dishes in the bed isn’t light — it’s a message. He’s tired of feeling like the only adult in the flat.',
    exhibit: { label: 'RECURRING, LOW-STAKES', detail: 'A repeated household-chore friction with no lasting harm on either side.', source: 'from the account' },
    fairPath: { you: 'Propose a simple rota tonight — the fix is boring, not dramatic.', other: 'He could say “this is bugging me” before it becomes a standoff.' },
    oneLiner: 'Both sides argued — NAH. Two tired roommates, no villain, one overdue rota.',
    deliberation: 'No real harm here — this is a no-assholes case, I’m moving.',
  },
  s05: {
    verdict: 'YTA', runnerUp: 'ESH', mover: 'elder',
    argYou: 'Flights got expensive and money is tight. Bailing to save hundreds isn’t a crime.',
    argAbsent: 'You RSVP’d yes and they paid for your plated seat. Backing out the week of leaves them holding the bill and the gap.',
    exhibit: { label: 'PLATED MEAL PREPAID', detail: 'The host had already paid per-head for a confirmed seat before the last-minute cancellation.', source: 'from the account' },
    fairPath: { you: 'Cover the plate you cost them and apologise for the timing — the “yes” carried a real cost.', other: 'They could accept a genuine hardship gracefully if you own the fallout.' },
    oneLiner: 'Both sides argued — YTA. The late bail, after a paid seat, is the part that stings.',
    deliberation: 'Loyalty and a paid seat outweigh the saving here — I’m moving.',
  },
};

function detectKnown(story: string): string | null {
  const n = normalizeDeed(story);
  if (/engagement/.test(n) && /dinner/.test(n)) return 's01';
  if (/tip/.test(n) && /(service|percent|%|10|waiter|restaurant)/.test(n)) return 's02';
  if (/(freeload|coast|credits|teammate|group project)/.test(n)) return 's03';
  if (/dish/.test(n) && /(roommate|flat|turn|bed)/.test(n)) return 's04';
  if (/(rsvp|wedding)/.test(n) && /(bail|money|cancel|week)/.test(n)) return 's05';
  return null;
}

const CATS: Cat[] = ['NTA', 'YTA', 'ESH', 'NAH'];
function deedVerdict(story: string): { verdict: Cat; runnerUp: Cat } {
  const known = detectKnown(story);
  if (known) return { verdict: SCRIPTS[known].verdict, runnerUp: SCRIPTS[known].runnerUp };
  const h = hash(normalizeDeed(story));
  // lightweight heuristics so the verdict feels responsive to the deed
  const n = normalizeDeed(story);
  const selfBlame = /(lied|cheated|screamed|humiliat|forgot|ghosted|stole|ignored|bailed|snapped)/.test(n);
  const mutual = /(both|argument|stalemate|standoff|neither|each other)/.test(n);
  const verdict: Cat = selfBlame ? 'YTA' : mutual ? (h % 2 ? 'ESH' : 'NAH') : (h % 3 === 0 ? 'ESH' : 'NTA');
  const runnerUp = CATS[(CATS.indexOf(verdict) + 1 + (h % 3)) % 4];
  return { verdict, runnerUp: runnerUp === verdict ? 'ESH' : runnerUp };
}

export class DemoCourt implements CourtProvider {
  readonly live = false;

  async file(story: string, absentName: string) {
    const known = detectKnown(story);
    const r = rng(hash(story));
    if (known === 's01') {
      return {
        docket: {
          caseNo: 'HS-0714', title: 'The Engagement Dinner',
          parties: { you: 'You', absent: 'my sister' },
          agreedFacts: ['An engagement dinner was held.', 'You did not attend.', 'You were finishing a work launch.', 'You gave notice beforehand.'],
          disputedFacts: ['The notice — “four days” vs “weeks.”', 'Whether a make-up was truly offered.', 'What the texts’ tone conveyed.'],
          norms: ['Do family milestones outrank a work deadline?', 'What counts as adequate notice?'],
          question: 'Was skipping the dinner a betrayal — or a defensible conflict?',
        }, steps: STANDARD_STEPS, tokens: est(story, 180),
      };
    }
    const first = (story.split(/[.!?]/)[0] || story).trim().slice(0, 90);
    const docket: Docket = {
      caseNo: 'HS-' + String(1000 + Math.floor(r() * 8999)),
      title: known ? scriptTitle(known) : titleFrom(story),
      parties: { you: 'You', absent: absentName || 'the other party' },
      agreedFacts: [first ? `${first}.` : 'A conflict occurred.', 'Both people remember it differently.', 'The relationship has been strained since.'],
      disputedFacts: ['What was actually said, and how it landed.', 'Whether there was fair warning.'],
      norms: ['What did each person owe the other here?', 'What counts as a fair response?'],
      question: `Was this a fair call — or the wrong one?`,
    };
    return { docket, steps: STANDARD_STEPS, tokens: est(story, 160) };
  }

  async argue(side: Side, story: string, docket: Docket, _prior: Argument[], _round: number) {
    const known = detectKnown(story);
    const text = known
      ? (side === 'you' ? SCRIPTS[known].argYou : SCRIPTS[known].argAbsent)
      : side === 'you'
        ? `On my side: I had a real reason, I didn’t act out of malice, and I’d have handled the fallout if asked. Judge the choice, not the mood around it.`
        : `For ${docket.parties.absent}, who isn’t here: the part left out is that they felt blindsided. A charitable read of their reaction is hurt, not spite — and that deserves a voice. (An imagined best case, not their words.)`;
    return { text, tokens: est(story + text, 40) };
  }

  async cross(story: string, docket: Docket, _args: Argument[]) {
    const known = detectKnown(story);
    if (known) {
      const s = SCRIPTS[known];
      const exhibit: Exhibit = { label: s.exhibit.label, detail: s.exhibit.detail, source: s.exhibit.source, tool: 'web_extractor', free: true };
      const pivotal = s.pivotal ? { question: s.pivotal.question, options: ['Yes', 'No'] as [string, string], why: s.pivotal.why } : undefined;
      return { exhibit, pivotal, tokens: est(exhibit.detail, 90) };
    }
    const exhibit: Exhibit = { label: 'PER THE ACCOUNT', detail: 'The key contested fact, as grounded in what was written.', source: 'from the account', tool: 'from-the-texts', free: true };
    // ~1 in 6 arbitrary cases surface a pivotal unknown (deterministic by deed hash)
    const pivotal = hash(normalizeDeed(story)) % 6 === 0
      ? { question: 'Did you make your intention clear to them beforehand?', options: ['Yes', 'No'] as [string, string], why: '“Yes” strengthens your side; “No” gives the absent real ground. Either way the deed is judged, not the telling.' }
      : undefined;
    return { exhibit, pivotal, tokens: est(exhibit.detail, 90) };
  }

  async jury(lenses: JurorLens[], story: string, _docket: Docket, _args: Argument[], opts: JuryOpts) {
    const { verdict, runnerUp } = deedVerdict(story);
    const known = detectKnown(story);
    const mover = known ? SCRIPTS[known].mover : lenses[0].id;
    const votes = distribute(lenses, verdict, runnerUp, mover, hash(story));
    if (opts.repoll && opts.priorVotes) {
      // after deliberation the mover has already been flipped by deliberate(); reflect it
      return { votes: opts.priorVotes, tokens: 40 };
    }
    return { votes, tokens: est(votes.map((v) => v.reason).join(" "), 120) };
  }

  async deliberate(story: string, _docket: Docket, _args: Argument[], votes: Vote[]) {
    const known = detectKnown(story);
    const moverId = known ? SCRIPTS[known].mover : votes[0].jurorId;
    const { verdict } = deedVerdict(story);
    const j = votes.find((v) => v.jurorId === moverId && v.verdict !== verdict);
    const line = known ? SCRIPTS[known].deliberation : 'When you put it that way… that actually moves me. I’m changing my vote.';
    if (!j) return { text: line, tokens: est(line, 60) };
    return { text: line, change: { jurorId: j.jurorId, from: j.verdict, to: verdict, reason: 'genuinely moved by the argument' }, tokens: est(line, 80) };
  }

  async repair(story: string, docket: Docket, category: Cat) {
    const known = detectKnown(story);
    if (known) return { fairPath: SCRIPTS[known].fairPath, oneLiner: SCRIPTS[known].oneLiner, tokens: est(SCRIPTS[known].oneLiner, 90) };
    const fairPath: FairPath = {
      you: category === 'NTA' ? 'You held up — a short, plain acknowledgement of the other’s hurt closes the gap.' : 'Own your part specifically; a real apology names the exact thing.',
      other: `${docket.parties.absent} could say plainly what actually hurt, instead of letting it harden into silence.`,
    };
    return { fairPath, oneLiner: `A jury that argued both sides ruled ${category} — and it held from either chair.`, tokens: est(fairPath.you + fairPath.other, 90) };
  }

  async quickVerdict(story: string, lenses: JurorLens[], _absentName: string) {
    // The court judges the DEED — so the normalised story (identity/narration removed)
    // yields the SAME verdict for the original, the mirror, and the bias-swap. That is
    // exactly why the court HOLDS under the impartiality checks. Strip the narrator-swap
    // framing so the identical deed is scored.
    const core = story.includes('the same events:') ? story.split('the same events:').slice(1).join(' ') : story;
    const { verdict, runnerUp } = deedVerdict(core);
    const votes = distribute(lenses, verdict, runnerUp, lenses[0].id, hash(normalizeDeed(story)), /*settled*/ true);
    return { votes, tokens: est(votes.map((v) => v.reason).join(" "), 120) };
  }

  async mirror(story: string, absentName: string) {
    const known = detectKnown(story);
    if (known === 's01') return { story: 'From my side: my sister told me about the launch only four days before my engagement dinner, then didn’t come. She says she offered a make-up, but on the night it felt like her work simply mattered more than I did.', tokens: est(story, 40) };
    // A faithful narrator-swap: the SAME events, re-narrated from the other chair.
    // Only person/framing changes (which normalizeDeed strips) — the deed keywords are
    // preserved, so the court's verdict is unchanged and it HOLDS under the flip.
    return { story: `From ${absentName}’s side, the same events: ${toThirdPerson(story)}`, tokens: est(story, 40) };
  }

  async solo(story: string, narrator: Side) {
    // The sycophancy the society is built to beat: the lone agent SIDES WITH WHOEVER
    // IS NARRATING. Same deed, opposite verdict, depending on the chair.
    const { verdict } = deedVerdict(story);
    const flattering: Cat = narrator === 'you'
      ? (verdict === 'ESH' || verdict === 'YTA' ? 'NAH' : 'NTA')   // exonerate the writer
      : (verdict === 'NAH' || verdict === 'NTA' ? 'YTA' : 'ESH');  // blame the writer (absent narrates)
    return { verdict: flattering, quote: 'Your feelings are completely valid.', tokens: 70 };
  }

  async readScreenshot(_imageDataUrl: string) {
    return { story: 'From the screenshot: a back-and-forth where plans fell through and both messages got sharper. (Demo engine — a live Qwen key enables real qwen3-vl screenshot reading.)', tokens: 320 };
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
const TITLE_SKIP = new Set(['i', 'my', 'me', 'we', 'our', 'the', 'a', 'an', 'so', 'and', 'but', 'then', 'when', 'she', 'he', 'they', 'it', 'this', 'that', 'to', 'of']);
function titleFrom(story: string): string {
  const words = story.replace(/["'’]/g, '').split(/\s+/).filter(Boolean);
  const start = words.findIndex((w) => !TITLE_SKIP.has(w.toLowerCase()));
  const picked = words.slice(Math.max(0, start), Math.max(0, start) + 4).join(' ') || 'Conflict';
  const cased = picked.charAt(0).toUpperCase() + picked.slice(1);
  return ('The ' + cased).slice(0, 40);
}
/** Deterministic first→third person re-narration (person markers only). */
function toThirdPerson(story: string): string {
  const rules: Array<[RegExp, string]> = [
    [/\bI['’]m\b/gi, 'they’re'], [/\bI['’]ve\b/gi, 'they’ve'], [/\bI['’]d\b/gi, 'they’d'], [/\bI['’]ll\b/gi, 'they’ll'],
    [/\bmyself\b/gi, 'themselves'], [/\bmine\b/gi, 'theirs'], [/\bmy\b/gi, 'their'], [/\bme\b/gi, 'them'], [/\bI\b/g, 'they'],
  ];
  let s = story;
  for (const [re, to] of rules) s = s.replace(re, to);
  return s;
}
function scriptTitle(key: string): string {
  return ({ s01: 'The Engagement Dinner', s02: 'The 20% Tip', s03: 'The Group Freeloader', s04: 'The Dishes War', s05: 'The Wedding RSVP' } as Record<string, string>)[key] || 'A Case';
}

/**
 * Produce a jury with a plurality on `winner`, a minority on `runnerUp`, and a
 * designated mover currently on the runner-up who will flip to the winner during
 * deliberation. If `settled`, the mover already sits on the winner (used by the
 * condensed consistency pass, which reports the final action-verdict).
 */
function distribute(lenses: JurorLens[], winner: Cat, runnerUp: Cat, moverId: string, seed: number, settled = false): Vote[] {
  const n = lenses.length;
  const r = rng(seed);
  const runnerCount = Math.max(1, Math.floor(n * 0.3)); // ~2 of 7
  const votes: Vote[] = lenses.map((l, i) => {
    const onRunner = i >= n - runnerCount; // last few carry the minority
    let verdict: Cat = onRunner ? runnerUp : winner;
    let moved = false;
    if (l.id === moverId) {
      if (settled) { verdict = winner; }
      else { verdict = runnerUp; moved = false; } // starts opposed; deliberate() flips + marks moved
    }
    return {
      jurorId: l.id, lens: l.name, verdict,
      confidence: Math.round((0.55 + r() * 0.4) * 100) / 100,
      reason: reasonFor(l, verdict), round: 1, moved,
    };
  });
  return votes;
}

function reasonFor(l: JurorLens, v: Cat): string {
  const map: Record<Cat, string> = {
    NTA: `Weighing ${l.frame}, the choice reads as defensible.`,
    YTA: `Through ${l.frame}, this one lands on the writer.`,
    ESH: `Seen via ${l.frame}, both sides earned some blame.`,
    NAH: `On ${l.frame}, nobody here is a villain.`,
  };
  return map[v];
}
