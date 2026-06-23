// ─── QwenCourt — the live society over Qwen Cloud models ────────────────────
// Each role is a genuinely distinct agent with a distinct model, distinct
// information, and a distinct mandate (see the design's cast). This class is the
// real path: it activates the moment DASHSCOPE_API_KEY exists.

import type {
  Argument, Docket, FairPath, HumanQuestion, JurorLens, ProceedingStep, Side, Vote, VerdictCategory, Exhibit,
} from '../shared/types.js';
import type { CourtProvider, JuryOpts } from './provider.js';
import { CONFIG } from './config.js';
import { chat, chatJson, ground, vision, type Msg } from './qwen.js';

const CATS = new Set<VerdictCategory>(['NTA', 'YTA', 'ESH', 'NAH']);
function coerceCat(v: any): VerdictCategory { const u = String(v || '').toUpperCase().trim(); return (CATS.has(u as VerdictCategory) ? u : 'NAH') as VerdictCategory; }
function clamp01(n: any): number { const x = Number(n); return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.6; }

export const STANDARD_STEPS: ProceedingStep[] = [
  { n: 1, label: 'file the case', owner: 'Clerk', tone: 'ochre' },
  { n: 2, label: 'open the argument', owner: 'Counsels ×2', tone: 'slate' },
  { n: 3, label: 'cross-examine', owner: 'Cross-examiner', tone: 'ochre' },
  { n: 4, label: 'deliberate + vote', owner: 'the Jury', tone: 'slate' },
  { n: 5, label: 'impartiality checks', owner: 'the Bench', tone: 'ink' },
  { n: 6, label: 'verdict + repair', owner: 'the Bench', tone: 'ink' },
];

const SYS_CLERK =
  'You are the Clerk of Hearsay, a fair-reasoning court that judges a personal conflict. ' +
  'You decompose a messy first-person story into a neutral case record. Judge the deed, not the storyteller. ' +
  'Never take the narrator\'s side; surface what they left out as disputed. Output strict JSON only.';

export class QwenCourt implements CourtProvider {
  readonly live = true;

  async file(story: string, absentName: string) {
    const messages: Msg[] = [
      { role: 'system', content: SYS_CLERK },
      {
        role: 'user',
        content:
          `Story (first person):\n"""${story}"""\n\nThe other party is: ${absentName}.\n\n` +
          'Return JSON: {"title": short case name, "parties": {"you": "You", "absent": "<the other party>"}, ' +
          '"agreedFacts": [3-4 short neutral facts both sides would accept], ' +
          '"disputedFacts": [2-3 short genuinely-contested points], ' +
          '"norms": [2 social norms in play, as questions], ' +
          '"question": the single real question before the court, phrased neutrally}.',
      },
    ];
    // The Clerk reasons long-horizon (thinking on).
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.clerk, thinking: true, maxTokens: 1100 });
    const docket: Docket = {
      caseNo: 'HS-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      title: String(value?.title || 'A conflict').slice(0, 60),
      parties: { you: 'You', absent: String(value?.parties?.absent || absentName || 'the other party') },
      agreedFacts: arr(value?.agreedFacts, 4),
      disputedFacts: arr(value?.disputedFacts, 3),
      norms: arr(value?.norms, 2),
      question: String(value?.question || 'Was the writer in the wrong — or was this a defensible choice?'),
    };
    return { docket, steps: STANDARD_STEPS, tokens };
  }

  async argue(side: Side, story: string, docket: Docket, prior: Argument[], round: number) {
    const who = side === 'you' ? 'Counsel for You' : 'Counsel for the Absent';
    const mandate = side === 'you'
      ? 'Argue the narrator\'s side as strongly and in good faith as it can be argued.'
      : `Argue for ${docket.parties.absent}, who is not in the room and never typed a word. Build the STRONGEST HONEST case they would make — the omitted context, the charitable reading. This is an IMAGINED best case: never claim to quote their real words.`;
    const priorText = prior.slice(-2).map((a) => `${a.who}: ${a.text}`).join('\n');
    const messages: Msg[] = [
      { role: 'system', content: `You are ${who} in a fair court. ${mandate} Speak in first person as an advocate, 2-3 sentences, sharp and specific. No preamble.` },
      { role: 'user', content: `The question: ${docket.question}\nDisputed: ${docket.disputedFacts.join('; ')}\nStory:\n"""${story}"""\n${priorText ? `\nAlready argued:\n${priorText}\n` : ''}\nGive your argument now (round ${round}).` },
    ];
    const { text, tokens } = await chat(messages, { model: CONFIG.models.counsel, temperature: 0.85, maxTokens: 260 });
    return { text: clean(text), tokens };
  }

  async cross(story: string, docket: Docket, args: Argument[]) {
    const messages: Msg[] = [
      { role: 'system', content: 'You are the Cross-examiner: a skeptic who grounds contested norms in reality and flags the one pivotal unknown a verdict turns on. Output strict JSON only.' },
      { role: 'user', content:
        `Question: ${docket.question}\nDisputed: ${docket.disputedFacts.join('; ')}\nStory:\n"""${story}"""\n\n` +
        'Return JSON: {"contested": {"claim": a checkable norm/fact this verdict may hinge on, "query": a short web query to check it, "label": a <28-char stamp like "NOTICE GIVEN: 4 DAYS"} or null, ' +
        '"pivotal": {"question": ONE clean yes/no question to the narrator about a genuinely missing pivotal fact, "why": one sentence on how each answer changes the case} or null}.' },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.cross, maxTokens: 500 });
    let extra = 0;
    let exhibit: Exhibit | undefined;
    if (value?.contested?.query) {
      const g = await ground(String(value.contested.query));
      if (g) {
        extra += g.tokens;
        exhibit = {
          label: String(value.contested.label || 'GROUNDED').slice(0, 30).toUpperCase(),
          detail: g.text.slice(0, 160),
          source: g.sources[0] || 'from the texts',
          tool: g.tool as any,
          free: g.tool === 'web_extractor',
        };
      } else {
        exhibit = { label: String(value.contested.label || 'PER THE TEXTS').slice(0, 30).toUpperCase(), detail: String(value.contested.claim || ''), source: 'from the account', tool: 'from-the-texts', free: true };
      }
    }
    let pivotal: HumanQuestion | undefined;
