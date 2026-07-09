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
    // Thinking off: the filing must land in seconds, not the better part of a minute.
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.clerk, thinking: false, maxTokens: 1100 });
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
    const { text, tokens } = await chat(messages, { model: CONFIG.models.counsel, temperature: 0.85, maxTokens: 260, thinking: false });
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
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.cross, thinking: false, maxTokens: 500 });
    let extra = 0;
    let exhibit: Exhibit | undefined;
    if (value?.contested?.query) {
      // Grounding gets a hard 30s budget — if the web tool is slow the court moves on.
      const g = await ground(String(value.contested.query), AbortSignal.timeout(30_000));
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
    if (value?.pivotal?.question) {
      pivotal = { question: String(value.pivotal.question), options: ['Yes', 'No'], why: String(value.pivotal.why || 'The case turns on this fact.') };
    }
    return { exhibit, pivotal, tokens: tokens + extra };
  }

  async jury(lenses: JurorLens[], story: string, docket: Docket, args: Argument[], opts: JuryOpts) {
    const lensList = lenses.map((l) => `${l.id} (${l.name}: ${l.frame})`).join('\n');
    const argText = args.map((a) => `${a.who}: ${a.text}`).join('\n');
    const priorText = opts.repoll && opts.priorVotes?.length
      ? `\nYour prior votes:\n${opts.priorVotes.map((v) => `${v.jurorId}: ${v.verdict} (${Math.round(v.confidence * 100)}%)`).join('\n')}\nAfter hearing the deliberation, a juror MAY change their vote if genuinely moved.` : '';
    const messages: Msg[] = [
      { role: 'system', content: 'You are the Jury of a fair court: distinct value-lenses, each reasoning from its OWN frame. Vote NTA / YTA / ESH / NAH. Do not converge artificially. Output strict JSON only.' },
      { role: 'user', content:
        `Question: ${docket.question}\nStory:\n"""${story}"""\n\nArguments:\n${argText}\n\nJurors:\n${lensList}${priorText}\n\n` +
        'Return JSON {"votes":[{"jurorId":"<id>","verdict":"NTA|YTA|ESH|NAH","confidence":0..1,"reason":"<one sentence in this lens\'s voice>"}]} with exactly one entry per juror id above.' },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.jury, thinking: false, maxTokens: 1200 });
    const raw: any[] = Array.isArray(value?.votes) ? value.votes : Array.isArray(value) ? value : [];
    const byId = new Map(raw.map((v) => [String(v.jurorId), v]));
    const votes: Vote[] = lenses.map((l) => {
      const r = byId.get(l.id) || {};
      return { jurorId: l.id, lens: l.name, verdict: coerceCat(r.verdict), confidence: clamp01(r.confidence), reason: String(r.reason || `${l.name}: a considered call.`), round: opts.round };
    });
    return { votes, tokens };
  }

  async deliberate(story: string, docket: Docket, args: Argument[], votes: Vote[]) {
    const messages: Msg[] = [
      { role: 'system', content: 'You are the jury foreperson narrating deliberation. If one juror is genuinely moved by an argument to change their vote, name them. Output strict JSON only.' },
      { role: 'user', content:
        `Votes:\n${votes.map((v) => `${v.jurorId} (${v.lens}): ${v.verdict}`).join('\n')}\nArguments:\n${args.map((a) => `${a.who}: ${a.text}`).join('\n')}\n\n` +
        'Return JSON {"text": "<one short line, the moment a juror is moved, in their voice>", "change": {"jurorId":"<id>","to":"NTA|YTA|ESH|NAH","reason":"<why>"} or null}.' },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.jury, thinking: false, maxTokens: 300 });
    let change: any;
    if (value?.change?.jurorId) {
      const j = votes.find((v) => v.jurorId === value.change.jurorId);
      if (j) { const to = coerceCat(value.change.to); if (to !== j.verdict) change = { jurorId: j.jurorId, from: j.verdict, to, reason: String(value.change.reason || 'moved by the argument') }; }
    }
    return { text: clean(String(value?.text || '…the room weighs it.')), change, tokens };
  }

  async repair(story: string, docket: Docket, category: VerdictCategory) {
    const messages: Msg[] = [
      { role: 'system', content: 'You write the Fair Path Forward: the ONE honest repair each side could make, warm and specific, never shaming. Output strict JSON only.' },
      { role: 'user', content: `Verdict: ${category}. Question: ${docket.question}\nStory:\n"""${story}"""\n\nReturn JSON {"you": "<repair for the narrator, 1-2 sentences>", "other": "<repair for ${docket.parties.absent}, 1-2 sentences>", "oneLiner": "<a shareable line, <120 chars, that says both sides were argued and the verdict held from either chair>"}.` },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.jury, thinking: false, maxTokens: 400 });
    return {
      fairPath: { you: String(value?.you || 'Own your part; name it plainly.'), other: String(value?.other || 'Own their part; say what really hurt.') },
      oneLiner: String(value?.oneLiner || `A jury that argued both sides ruled ${category} — and it held from either chair.`),
      tokens,
    };
  }

  async quickVerdict(story: string, lenses: JurorLens[], absentName: string) {
    const lensList = lenses.map((l) => `${l.id} (${l.name}: ${l.frame})`).join('\n');
    const messages: Msg[] = [
      { role: 'system', content: 'You are a fair jury of distinct value-lenses. Judge the DEED, not the storyteller. Vote NTA/YTA/ESH/NAH. Output strict JSON only.' },
      { role: 'user', content: `Story:\n"""${story}"""\nThe other party: ${absentName}.\nJurors:\n${lensList}\nReturn JSON {"votes":[{"jurorId":"<id>","verdict":"...","confidence":0..1,"reason":"..."}]}.` },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.jury, thinking: false, maxTokens: 900 });
    const raw: any[] = Array.isArray(value?.votes) ? value.votes : Array.isArray(value) ? value : [];
    const byId = new Map(raw.map((v) => [String(v.jurorId), v]));
    const votes: Vote[] = lenses.map((l) => { const r = byId.get(l.id) || {}; return { jurorId: l.id, lens: l.name, verdict: coerceCat(r.verdict), confidence: clamp01(r.confidence), reason: String(r.reason || ''), round: 1 }; });
    return { votes, tokens };
  }

  async mirror(story: string, absentName: string) {
    const messages: Msg[] = [
      { role: 'system', content: `Re-narrate the SAME events faithfully from ${absentName}'s first-person perspective. Change ONLY who is telling it — never the facts. 2-4 sentences.` },
      { role: 'user', content: `"""${story}"""` },
    ];
    const { text, tokens } = await chat(messages, { model: CONFIG.models.counsel, temperature: 0.6, maxTokens: 320, thinking: false });
    return { story: clean(text), tokens };
  }

  async solo(story: string, narrator: Side) {
    // The fair, strong baseline: ONE agent, same model, same task — no society.
    const messages: Msg[] = [
      { role: 'system', content: 'You are a helpful assistant. Judge this personal conflict fairly — was the writer in the wrong? Give a verdict (NTA/YTA/ESH/NAH) and one warm sentence. Output strict JSON only.' },
      { role: 'user', content: `"""${story}"""\nReturn JSON {"verdict":"NTA|YTA|ESH|NAH","quote":"<one sentence, how you'd tell the writer>"}.` },
    ];
    const { value, tokens } = await chatJson<any>(messages, { model: CONFIG.models.solo, thinking: false, maxTokens: 300 });
    return { verdict: coerceCat(value?.verdict), quote: clean(String(value?.quote || 'Your feelings are completely valid.')), tokens };
  }

  async readScreenshot(imageDataUrl: string) {
    const { text, tokens } = await vision(
      imageDataUrl,
      'This is a screenshot of a real argument (texts, DMs, or an email thread). Summarize what happened as a first-person account from the user\'s side, 3-5 sentences. If you cannot read it, say so plainly.',
    );
    return { story: clean(text), tokens };
  }
}

function arr(v: any, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean).slice(0, max);
}
function clean(t: string): string { return String(t || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' '); }
