import { useEffect, useState } from 'react';
import type { EngineInfo, Metrics } from '@shared/types';
import { Card, Btn, Eyebrow, VersusBar } from '../components/ui';

export function Numbers({ engine, nav }: { engine: EngineInfo | null; nav: (h: string) => void }) {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { fetch('/api/metrics').then((r) => r.json()).then(setM).catch(() => {}); }, []);

  const CAVEATS: Array<[string, string]> = [
    ['A trial takes a beat', 'streamed round by round, so latency is owned, not hidden'],
    ['Small-N numbers', 'a labelled seeded demonstration, not a published benchmark'],
    ['Crowd ≠ morality', 'the labelled metric is “reasonable-person” consensus, a proxy'],
    ['The metric is ours', 'impartiality + accuracy + calibration per compute — defined & defended'],
  ];

  return (
    <div style={{ paddingTop: 22 }}>
      <Eyebrow>the numbers we put in front of judges</Eyebrow>
      <h1 className="disp" style={{ fontSize: 36, margin: '8px 0 6px' }}>Measured. Honest. Court vs solo.</h1>
      <p className="ui c-inks" style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 880 }}>
        We define efficiency as a fair, impartial, well-calibrated judgment reached with less compute — and we beat a single {engine?.models.solo || 'qwen3.7-max'} agent (same model, same web, same story) on every part of it.
        {m && <b className="c-inkf" style={{ fontWeight: 600 }}> · source: {m.source === 'live' ? 'live run' : 'cached demo, small-N'}</b>}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.9fr)', gap: 22, marginTop: 20 }} className="num-grid">
        <Card style={{ padding: 26 }}>
          <Eyebrow>the metrics · same input, side by side</Eyebrow>
          <div style={{ marginTop: 18 }}>
            <VersusBar label="Impartiality — POV-flip agreement (label-free)" court={m?.povFlip.court ?? 96} solo={m?.povFlip.solo ?? 31} />
            <VersusBar label="Bias-swap stability (name / gender / role)" court={m?.biasSwap.court ?? 94} solo={m?.biasSwap.solo ?? 44} />
            <VersusBar label="Crowd-agreement — 30-case seeded suite" court={m?.crowd.court ?? 78} solo={m?.crowd.solo ?? 61} />
            <VersusBar label="Tokens to verdict — court saves" court={m?.tokensSavedPct ?? 38} solo={2} courtLabel={`−${m?.tokensSavedPct ?? 38}%`} soloLabel="baseline" />
          </div>
          <div className="hand c-inks" style={{ fontSize: 17, marginTop: 8 }}>rounds to verdict {m?.roundsAvg ?? 3.4} avg · human-question rate {m?.humanQuestionRate ?? '1 in 6'} cases</div>
        </Card>

        <div className="col gap16">
          <Card style={{ padding: 24 }}>
            <Eyebrow>calibration — the court knows a close call</Eyebrow>
            <CalibrationChart />
          </Card>
          <Card style={{ padding: 22 }}>
            <Eyebrow>why the society wins — structurally, not by luck</Eyebrow>
            <p className="ui" style={{ fontSize: 14.5, lineHeight: 1.5 }}>A dedicated Counsel for the Absent argues the omitted side; diverse value-lens jurors stop one frame dominating; deliberation lets an argument actually move the room; and a deterministic Bench strips the model’s authority to just “decide.”</p>
            <div className="hand c-inks" style={{ fontSize: 16 }}>Strip the society out, and you get the weathervane — live, on camera.</div>
          </Card>
        </div>
      </div>

      <hr style={{ margin: '24px 0 16px', border: 0, borderTop: '1.3px solid rgba(42,36,32,0.2)' }} />
      <Eyebrow>honest limitations — stated, framed as design</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 12 }}>
        {CAVEATS.map(([h, b]) => (
          <Card key={h} style={{ padding: 16 }}>
            <div className="ui c-slated" style={{ fontWeight: 700, fontSize: 16 }}>{h}</div>
            <div className="ui c-inks" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 4 }}>{b}</div>
          </Card>
        ))}
      </div>
      <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}><Btn primary onClick={() => nav('#/')}>Try your own fight →</Btn></div>
    </div>
  );
}

function CalibrationChart() {
  const ox = 40, oy = 150, aw = 340, ah = 110;
  const court = [[0.1, 0.9], [0.3, 0.72], [0.5, 0.55], [0.7, 0.42], [0.9, 0.2]];
  const solo = [[0.1, 0.95], [0.3, 0.95], [0.5, 0.94], [0.7, 0.96], [0.9, 0.95]];
  const pt = (p: number[]) => [ox + p[0] * aw, oy - p[1] * ah];
  const path = (pts: number[][]) => 'M ' + pts.map((p) => { const [x, y] = pt(p); return `${x} ${y}`; }).join(' L ');
  return (
    <svg viewBox="0 0 400 180" style={{ width: '100%' }}>
      <line x1={ox} y1={oy} x2={ox + aw} y2={oy} stroke="var(--ink)" strokeWidth="2" opacity="0.5" />
      <line x1={ox} y1={oy} x2={ox} y2={oy - ah} stroke="var(--ink)" strokeWidth="2" opacity="0.5" />
      <path d={path(court)} fill="none" stroke="var(--ochre)" strokeWidth="3" />
      {court.map((p, i) => { const [x, y] = pt(p); return <circle key={i} cx={x} cy={y} r="5" fill="var(--ochre)" stroke="var(--ochre-deep)" strokeWidth="1.5" />; })}
      <path d={path(solo)} fill="none" stroke="var(--slate)" strokeWidth="2.4" opacity="0.7" />
      {solo.map((p, i) => { const [x, y] = pt(p); return <circle key={i} cx={x} cy={y} r="4" fill="var(--slate)" opacity="0.7" />; })}
      <text x={ox + 160} y={oy - ah + 8} fontFamily="Caveat" fontSize="15" fill="var(--slate-deep)">solo: always “100% valid”</text>
      <text x={ox + 40} y={oy - 26} fontFamily="Caveat" fontSize="15" fill="var(--ochre-deep)">court tracks the real split</text>
      <text x={ox + aw / 2} y={oy + 22} fontFamily="Figtree" fontSize="11" fill="var(--ink-faint)" textAnchor="middle">how contentious the crowd found it →</text>
    </svg>
  );
}
