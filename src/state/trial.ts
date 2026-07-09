// The live trial store: a reducer over the streamed CourtEvents that the courtroom
// screens render from. One source of truth for the filing, the arguments, the jury,
// the vote-change, the human question, the Bench verdict, and the impartiality checks.
import { useCallback, useReducer, useRef } from 'react';
import type {
  Argument, CaseInput, Consistency, CourtEvent, Docket, Exhibit, Gauge, HumanQuestion,
  ProceedingStep, Side, Verdict, Vote,
} from '@shared/types';
import { streamTrial } from '../lib/api';
import type { RibbonEntry } from '../components/ui';

export type Phase = 'idle' | 'filing' | 'arguing' | 'cross' | 'paused' | 'deliberating' | 'ruled' | 'error';

export interface TrialState {
  phase: Phase;
  caseId?: string;
  demo: boolean;
  title: string;
  narrator: Side;
  docket?: Docket;
  steps: ProceedingStep[];
  args: Argument[];
  exhibit?: Exhibit;
  question?: HumanQuestion;
  votes: Vote[];
  deliberationLine?: string;
  verdict?: Verdict;
  consistency?: Consistency;
  gauge?: Gauge;
  record: RibbonEntry[];
  notes: string[];
  error?: string;
  input?: CaseInput;
}

const initial: TrialState = {
  phase: 'idle', demo: false, title: '', narrator: 'you', steps: [], args: [], votes: [], record: [], notes: [],
};

const statusPhase: Record<string, Phase> = {
  FILING: 'filing', ARGUING: 'arguing', CROSS: 'cross', PAUSED: 'paused', DELIBERATING: 'deliberating', RULED: 'ruled',
};

function rec(state: TrialState, e: RibbonEntry): RibbonEntry[] { return [...state.record, e]; }

function reduce(state: TrialState, ev: CourtEvent): TrialState {
  switch (ev.t) {
    case 'case_opened':
      return { ...state, caseId: ev.caseId, title: ev.title, narrator: ev.narrator, demo: ev.demo, phase: 'filing' };
    case 'status':
      return { ...state, gauge: ev.gauge, phase: statusPhase[ev.gauge.status] ?? state.phase };
    case 'note':
      return ev.level === 'honest' ? { ...state, notes: [...new Set([...state.notes, ev.text])] } : state;
    case 'filing':
      return {
        ...state, docket: ev.docket, steps: ev.steps, title: ev.docket.title,
        record: rec(state, { who: 'Clerk — files the case', text: ev.docket.question }),
      };
    case 'argument':
      return {
        ...state, args: [...state.args, ev.arg], phase: 'arguing',
        record: rec(state, { who: ev.arg.who, text: ev.arg.text, tone: ev.arg.side === 'you' ? 'warm' : 'cool' }),
      };
    case 'objection':
      return { ...state, record: rec(state, { who: ev.by, text: ev.text }) };
    case 'exhibit':
      return { ...state, exhibit: ev.exhibit, record: rec(state, { who: 'Cross-examiner', text: `grounded: ${ev.exhibit.detail}` }) };
    case 'deliberation':
      return { ...state, deliberationLine: ev.text };
    case 'vote': {
      const votes = upsert(state.votes, ev.vote);
      return { ...state, votes };
    }
    case 'vote_change':
      return {
        ...state,
        record: rec(state, { who: `${ev.change.lens} juror`, text: `${state.deliberationLine || '…that moves me'} — ${ev.change.from} → ${ev.change.to}`, tone: 'moved' }),
      };
    case 'human_question':
      return { ...state, question: ev.question, phase: 'paused' };
    case 'human_answer':
      return { ...state, question: undefined, record: rec(state, { who: 'You (on the record)', text: `answered: ${ev.answer}` }) };
    case 'verdict':
      return { ...state, verdict: ev.verdict, phase: 'ruled', record: rec(state, { who: 'the Bench rules', text: `${ev.verdict.category} · ${ev.verdict.split}` }) };
    case 'consistency':
      return { ...state, consistency: ev.consistency };
    case 'done':
      return { ...state, phase: ev.paused ? 'paused' : (state.verdict ? 'ruled' : state.phase) };
    case 'error':
      // a late connection drop must never blank out a verdict already on screen
      if (state.phase === 'ruled') return state;
      return { ...state, phase: 'error', error: ev.message };
    default:
      return state;
  }
}

function upsert(votes: Vote[], v: Vote): Vote[] {
  const i = votes.findIndex((x) => x.jurorId === v.jurorId);
  if (i < 0) return [...votes, v];
  const next = votes.slice(); next[i] = v; return next;
}

type Action = { type: 'event'; ev: CourtEvent } | { type: 'reset' } | { type: 'begin'; input: CaseInput };
function rootReducer(state: TrialState, action: Action): TrialState {
  if (action.type === 'reset') return initial;
  if (action.type === 'begin') return { ...initial, input: action.input, phase: 'filing', demo: state.demo };
  return reduce(state, action.ev);
}

export function useTrial() {
  const [state, dispatch] = useReducer(rootReducer, initial);
  const abortRef = useRef<null | (() => void)>(null);

  const start = useCallback((input: CaseInput & { exampleId?: string; panelSize?: number }) => {
    abortRef.current?.();
    dispatch({ type: 'begin', input });
    abortRef.current = streamTrial('/api/trial', input, (ev) => dispatch({ type: 'event', ev }));
  }, []);

  const resume = useCallback((caseId: string, answer: string, input?: CaseInput) => {
    abortRef.current?.();
    abortRef.current = streamTrial(`/api/trial/${caseId}/resume`, { answer, input }, (ev) => dispatch({ type: 'event', ev }));
  }, []);

  const reset = useCallback(() => { abortRef.current?.(); dispatch({ type: 'reset' }); }, []);

  /** Replay a decided case from its recorded events (no pacing). */
  const replay = useCallback((events: CourtEvent[]) => {
    abortRef.current?.();
    dispatch({ type: 'reset' });
    for (const ev of events) dispatch({ type: 'event', ev });
  }, []);

  return { state, start, resume, reset, replay };
}
