// Client API — always relative /api (no hardcoded host/port). The trial is streamed
// as Server-Sent Events over a POST body, parsed here into CourtEvents.
import type { CourtEvent, EngineInfo, Metrics, DocketCard, SuiteRow, SuiteCase, JurorLens, SoloResult } from '@shared/types';

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}
export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  engine: () => getJSON<EngineInfo>('/api/engine'),
  metrics: () => getJSON<Metrics>('/api/metrics'),
  jurors: () => getJSON<JurorLens[]>('/api/jurors'),
  suite: () => getJSON<{ cases: Omit<SuiteCase, 'story'>[]; rows: SuiteRow[] }>('/api/suite'),
  examples: () => getJSON<{ cards: DocketCard[]; intake: DocketCard[]; stories: Record<string, SuiteCase> }>('/api/examples'),
  docket: () => getJSON<{ decided: DocketCard[]; examples: DocketCard[] }>('/api/docket'),
  record: (id: string) => getJSON<{ id: string; events: CourtEvent[] }>(`/api/record/${id}`),
