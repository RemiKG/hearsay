import { useEffect, useState } from 'react';
import type { EngineInfo } from '@shared/types';
import { JURORS } from '@shared/lenses';
import { Card, Btn, Chip, Eyebrow, Speech, Ribbon, Gauge, SplitFlap, BenchBoard } from '../components/ui';
import { Character, Clerk, Bell, Gavel, Chair, Stamp, Paddle } from '../art/Sketch';
import { api } from '../lib/api';
import { shareLink } from '../lib/share';
import type { useTrial } from '../state/trial';

type Trial = ReturnType<typeof useTrial>;
const faceOf = (id: string) => (JURORS.find((j) => j.id === id)?.face || {}) as Record<string, unknown>;
const seedOf = (id: string) => JURORS.find((j) => j.id === id)?.seed || 100;

export function TrialScreen({ trial, engine, nav, openCaseId }: { trial: Trial; engine: EngineInfo | null; nav: (h: string) => void; openCaseId?: string }) {
  const { state } = trial;
  useEffect(() => {
    if (openCaseId && state.caseId !== openCaseId) api.record(openCaseId).then((r) => trial.replay(r.events)).catch(() => {});
  }, [openCaseId]); // eslint-disable-line

  if (state.phase === 'idle') return <Empty nav={nav} />;
  if (state.phase === 'error') return <Card style={{ padding: 24, marginTop: 40 }}><Eyebrow>the court could not sit</Eyebrow><p className="ui">{state.error}</p><Btn onClick={() => nav('#/')}>Back</Btn></Card>;
  if (state.phase === 'ruled') return <VerdictView trial={trial} nav={nav} />;

  return (
    <>
      {state.args.length === 0 && state.phase === 'filing' ? <RecordView trial={trial} /> : <SessionView trial={trial} />}
      {state.phase === 'paused' && state.question && <QuestionOverlay trial={trial} />}
    </>
  );
}

function Empty({ nav }: { nav: (h: string) => void }) {
  return <div style={{ padding: '60px 0', textAlign: 'center' }}>
    <Bell width={54} /><h2 className="disp" style={{ fontSize: 30 }}>No case is in session.</h2>
    <Btn primary onClick={() => nav('#/')}>Convene the court</Btn>
  </div>;
}

// ── screen 02 — the case record (task decomposition) ─────────────────────────
function RecordView({ trial }: { trial: Trial }) {
  const { docket, steps, gauge } = trial.state;
  return (
    <div style={{ paddingTop: 20 }}>
      <Eyebrow>the clerk files the case · task decomposition</Eyebrow>
      <h1 className="disp" style={{ fontSize: 38, margin: '8px 0 20px' }}>Your story, filed as a case.</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 22 }} className="rec-grid">
        <Card style={{ padding: 26 }}>
          {!docket ? <Filing /> : <>
            <div className="row between center">
              <div className="disp" style={{ fontSize: 24 }}>{docket.title}</div>
              <div className="mono c-inkf" style={{ fontSize: 14 }}>No. {docket.caseNo}</div>
            </div>
            <hr style={{ margin: '12px 0 18px', border: 0, borderTop: '1.4px solid rgba(42,36,32,0.18)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <Eyebrow>the parties</Eyebrow>
                <div className="row gap12 center" style={{ margin: '8px 0 6px' }}>
                  <Character cfg={{ seed: 31, tone: 'warm', garment: 'robe', hair: 'side', brow: 'kind', mouth: 'soft' }} width={54} />
                  <div><div className="disp c-ochred" style={{ fontSize: 18 }}>{docket.parties.you}</div><div className="ui c-inkf" style={{ fontSize: 12 }}>the narrator</div></div>
                </div>
                <div className="row gap12 center" style={{ position: 'relative' }}>
                  <Character cfg={{ seed: 44, tone: 'cool', garment: 'plain', hair: 'bun', brow: 'flat', mouth: 'set' }} width={54} />
                  <div><div className="disp c-slated" style={{ fontSize: 18 }}>{docket.parties.absent}</div><div className="ui c-inkf" style={{ fontSize: 12 }}>the absent party</div></div>
                </div>
              </div>
              <div>
                <Eyebrow>agreed facts</Eyebrow>
                <ul className="bullets">{docket.agreedFacts.map((f, i) => <li key={i} style={{ ['--b' as any]: 'var(--slate)' }}>{f}</li>)}</ul>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
              <div><Eyebrow>disputed facts</Eyebrow><ul className="bullets">{docket.disputedFacts.map((f, i) => <li key={i} style={{ ['--b' as any]: 'var(--ochre)' }}>{f}</li>)}</ul></div>
              <div><Eyebrow>norms in play</Eyebrow><ul className="bullets">{docket.norms.map((f, i) => <li key={i} style={{ ['--b' as any]: 'var(--ink)' }}>{f}</li>)}</ul></div>
            </div>
            <Card accent flat style={{ padding: '16px 20px', marginTop: 18, background: 'var(--paper)' }}>
              <Eyebrow>the question before the court</Eyebrow>
              <div className="disp" style={{ fontSize: 21, marginTop: 6 }}>“{docket.question}”</div>
            </Card>
          </>}
        </Card>
        <div className="col gap16">
          <Card style={{ padding: 20 }}>
            <Eyebrow>order of proceedings · roles assigned</Eyebrow>
            <div className="col" style={{ marginTop: 10, gap: 2 }}>
              {(steps.length ? steps : DEFAULT_STEPS).map((s) => (
                <div key={s.n} className="row between center" style={{ padding: '9px 0', borderBottom: '1px solid rgba(42,36,32,0.1)' }}>
                  <span className="row center gap12"><span className="mono c-ochred" style={{ fontSize: 16 }}>{s.n}</span><span className="ui" style={{ fontWeight: 600, fontSize: 15 }}>{s.label}</span></span>
                  <Chip dot dotColor={s.tone === 'ochre' ? 'var(--ochre)' : s.tone === 'slate' ? 'var(--slate)' : 'var(--ink)'} style={{ fontSize: 12 }}>{s.owner}</Chip>
                </div>
              ))}
            </div>
          </Card>
          <Gauge rows={gaugeRows(trial)} />
          <div className="row center gap12"><Clerk pose="preside" width={92} /><span className="hand c-inks" style={{ fontSize: 18 }}>the Clerk presides</span></div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_STEPS = [
  { n: 1, label: 'file the case', owner: 'Clerk', tone: 'ochre' as const },
  { n: 2, label: 'open the argument', owner: 'Counsels ×2', tone: 'slate' as const },
  { n: 3, label: 'cross-examine', owner: 'Cross-examiner', tone: 'ochre' as const },
  { n: 4, label: 'deliberate + vote', owner: 'the Jury', tone: 'slate' as const },
  { n: 5, label: 'impartiality checks', owner: 'the Bench', tone: 'ink' as const },
  { n: 6, label: 'verdict + repair', owner: 'the Bench', tone: 'ink' as const },
];

function Filing() {
  return <div className="col center" style={{ padding: 40, gap: 12 }}><div className="ringing"><Bell width={54} /></div><div className="hand c-inks" style={{ fontSize: 22 }}>the Clerk is reading your story…</div></div>;
}

// ── screen 03 — the court in session ─────────────────────────────────────────
function SessionView({ trial }: { trial: Trial }) {
  const { args, exhibit, votes, deliberationLine } = trial.state;
  const you = [...args].reverse().find((a) => a.side === 'you');
  const absent = [...args].reverse().find((a) => a.side === 'absent');
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 22 }} className="sess-grid">
        <div>
          <Eyebrow>the court in session</Eyebrow>
          <div className="row center" style={{ justifyContent: 'center', gap: 10, margin: '4px 0 14px' }}>
            <Character cfg={{ seed: 53, tone: 'neutral', hair: 'bun', gray: true, glasses: true, brow: 'kind', mouth: 'speak', jaw: 'round', wide: true, blouse: true, cheeks: true, skin: '#E9C199' }} width={78} />
            <Bell width={34} /><Gavel width={70} rot={-16} />
            <span className="hand c-inkf" style={{ fontSize: 16 }}>the Clerk presides · the Bench waits</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Character cfg={{ seed: 31, tone: 'warm', hair: 'wavy', brow: 'up', mouth: 'speak', gaze: 1, jaw: 'oval', cheeks: true, tilt: 4 }} width={108} />
            {you ? <Speech side="warm" who="Counsel for You">“{you.text}”</Speech> : <Waiting who="Counsel for You" />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            {absent ? <Speech side="cool" who="Counsel for the Absent">“{absent.text}”{absent.imagined && <div className="ui c-inkf" style={{ fontSize: 11, marginTop: 6 }}>an imagined best case — never their real words</div>}</Speech> : <Waiting who="Counsel for the Absent" />}
            <div style={{ position: 'relative' }}>
              <Character cfg={{ seed: 42, tone: 'cool', hair: 'side', brow: 'flat', mouth: 'set', gaze: -1, jaw: 'square', tilt: -4 }} width={108} />
              <div style={{ position: 'absolute', right: -18, bottom: 26 }}><Chair width={48} /></div>
            </div>
          </div>

          {exhibit && (
            <div className="row center gap12 fade-up" style={{ margin: '4px 0 16px' }}>
