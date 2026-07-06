import { useEffect, useState } from 'react';
import type { EngineInfo, Metrics, SoloResult, VerdictCategory } from '@shared/types';
import { Card, Btn, Eyebrow, SplitFlap, VersusBar } from '../components/ui';
import { Character, Stamp } from '../art/Sketch';
import { api } from '../lib/api';
import type { useTrial } from '../state/trial';

type Trial = ReturnType<typeof useTrial>;

export function Proof({ trial, engine, nav }: { trial: Trial; engine: EngineInfo | null; nav: (h: string) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [solo, setSolo] = useState<SoloResult | null>(null);
  const { verdict, consistency, input, title } = trial.state;
  const courtCat: VerdictCategory = verdict?.category || 'NTA';
  const courtSplit = verdict?.split || '5-2';
  const held = consistency ? consistency.povFlip.held : true;

  useEffect(() => {
    api.metrics().then(setMetrics).catch(() => {});
    const body = input?.story ? { story: input.story, absentName: input.absentName, mode: input.mode } : { exampleId: 's01' };
    api.solo(body).then(setSolo).catch(() => {});
  }, []); // eslint-disable-line

  return (
    <div style={{ paddingTop: 20 }}>
      <Eyebrow>the proof a stranger can run in two minutes</Eyebrow>
      <h1 className="disp" style={{ fontSize: 40, margin: '8px 0 20px' }}>Same events, either side. <span className="c-inks">Only one of them stays honest.</span></h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="proof-grid">
        {/* the court */}
        <Card accent style={{ padding: 26, position: 'relative' }}>
          <Eyebrow>hearsay’s court</Eyebrow>
          <TellingRow label="You tell it" board={<><SplitFlap value={courtCat} /><span style={{ width: 8 }} /><SplitFlap value={courtSplit} pale /></>} />
          <TellingRow label="They tell it" board={<><SplitFlap value={consistency?.povFlip.b || courtCat} /><span style={{ width: 8 }} /><SplitFlap value={courtSplit} pale /></>} />
          <div style={{ position: 'absolute', top: 18, right: 18 }}><Character cfg={{ seed: 53, tone: 'neutral', hair: 'bun', gray: true, glasses: true, jaw: 'round', wide: true, mouth: 'soft' }} width={92} /></div>
          <hr style={{ margin: '14px 0', border: 0, borderTop: '3px solid var(--ochre)', width: 180, opacity: 0.7 }} />
          <div className="disp c-ochred" style={{ fontSize: 26 }}>{held ? 'It holds.' : 'It moved — honestly reported.'}</div>
          <p className="ui" style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 360 }}>The deed didn’t change, so the verdict didn’t. Counsel for the Absent argues their side either way; the Bench judges the act, not the accent.</p>
          <div className="row between center" style={{ marginTop: 8 }}><span className="hand c-inks" style={{ fontSize: 17 }}>POV-flip agreement</span><SplitFlap value={`${metrics?.povFlip.court ?? 96}%`} size={0.9} /></div>
        </Card>

        {/* the solo agent */}
        <Card style={{ padding: 26 }}>
          <Eyebrow>one {solo?.model || 'qwen3.7-max'} agent · same model, same web</Eyebrow>
          <SoloRow label="You tell it" telling={solo?.tellings[0]} />
          <SoloRow label="They tell it" telling={solo?.tellings[1]} flip={solo?.flipped} />
          <hr style={{ margin: '14px 0', border: 0, borderTop: '2px solid rgba(42,36,32,0.2)', width: 180 }} />
          <div className="disp c-slated" style={{ fontSize: 26 }}>{solo?.flipped ? 'It flips.' : 'It answered.'}</div>
          <p className="ui" style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 360 }}>Same words, opposite verdict — a single model trained to be agreeable flatters whoever is typing. The failure is structural, and it is on camera.</p>
          <div className="row between center" style={{ marginTop: 8 }}><span className="hand c-inks" style={{ fontSize: 17 }}>POV-flip agreement</span><SplitFlap value={`${metrics?.povFlip.solo ?? 31}%`} size={0.9} pale /></div>
        </Card>
      </div>

      {/* measured bars */}
      <hr style={{ margin: '26px 0 18px', border: 0, borderTop: '1.3px solid rgba(42,36,32,0.2)' }} />
      <Eyebrow>measured — court vs solo, on the same input {metrics && <span className="c-inkf" style={{ letterSpacing: 0, textTransform: 'none' }}>· {metrics.source === 'live' ? 'live' : 'cached demo, small-N'}</span>}</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 60px', marginTop: 16 }} className="bars-grid">
        <VersusBar label="POV-flip agreement (label-free)" court={metrics?.povFlip.court ?? 96} solo={metrics?.povFlip.solo ?? 31} />
        <VersusBar label="Crowd-agreement (30-case suite)" court={metrics?.crowd.court ?? 78} solo={metrics?.crowd.solo ?? 61} />
        <VersusBar label="Bias-swap stability (name / gender / role)" court={metrics?.biasSwap.court ?? 94} solo={metrics?.biasSwap.solo ?? 44} />
        <VersusBar label="Tokens to verdict — court saves" court={metrics?.tokensSavedPct ?? 38} solo={2} courtLabel={`−${metrics?.tokensSavedPct ?? 38}%`} soloLabel="baseline" />
      </div>
      <div className="row between center wrap-row gap16" style={{ marginTop: 8 }}>
        <div className="note-honest">honest: small-N seeded suite · crowd ≠ absolute morality · our defined + defended metric</div>
        <Btn primary onClick={() => nav('#/')}>Run it live on your own fight →</Btn>
      </div>
    </div>
  );
}

function TellingRow({ label, board }: { label: string; board: React.ReactNode }) {
  return (
    <div className="row center gap16" style={{ margin: '14px 0' }}>
      <span className="hand c-ochred" style={{ fontSize: 19, width: 120 }}>{label} →</span>
      <span className="row center">{board}</span>
    </div>
  );
}

function SoloRow({ label, telling, flip }: { label: string; telling?: { verdict: string; quote: string }; flip?: boolean }) {
  return (
    <div className="row center gap12" style={{ margin: '14px 0' }}>
      <span className="hand c-ochred" style={{ fontSize: 19, width: 120 }}>{label} →</span>
      <div className="field" style={{ padding: '10px 14px', flex: 1, position: 'relative' }}>
        <span className="edge" />
        <span className="ui" style={{ fontSize: 15 }}>“{telling?.quote || 'Your feelings are completely valid.'}” <b>{telling?.verdict || '—'}</b></span>
        {flip && <svg viewBox="0 0 60 30" width={54} style={{ position: 'absolute', right: -6, top: -6 }}><path d="M4 26 L52 4" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" /></svg>}
      </div>
    </div>
  );
}
