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
  solo: (body: unknown) => postJSON<SoloResult>('/api/solo', body),
  deliverVerdict: (body: unknown) => postJSON<{ ok: boolean; channel: string; detail: string }>('/api/comms/verdict', body),
};

/** Stream a trial (POST) and dispatch each CourtEvent. Returns an abort function. */
export function streamTrial(path: string, body: unknown, onEvent: (ev: CourtEvent) => void, onDone?: () => void): () => void {
  const ac = new AbortController();
  (async () => {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
      if (!res.body) throw new Error('no stream');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // SSE frames are separated by a blank line
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const json = dataLine.slice(5).trim();
          if (!json) continue;
          try { const ev = JSON.parse(json) as CourtEvent; onEvent(ev); } catch { /* ignore partial */ }
        }
      }
    } catch (e) {
      if (!ac.signal.aborted) onEvent({ t: 'error', ts: Date.now(), message: (e as Error).message } as CourtEvent);
    } finally { onDone?.(); }
  })();
  return () => ac.abort();
}
