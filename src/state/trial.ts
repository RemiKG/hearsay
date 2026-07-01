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
