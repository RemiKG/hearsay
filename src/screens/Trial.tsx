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
              <Character cfg={{ seed: 77, tone: 'neutral', hair: 'short', brow: 'worry', mouth: 'set', jaw: 'oval', skin: '#D9A56A', gaze: 1 }} width={64} />
              <div>
                <Stamp label={exhibit.label} width={186} />
                <div className="row center gap8" style={{ marginTop: 4 }}>
                  <span className="hand c-inks" style={{ fontSize: 15 }}>the Cross-examiner grounds a contested fact</span>
                  <Chip dot dotColor="var(--ochre)" style={{ fontSize: 11 }}>{exhibit.tool} · {exhibit.free ? 'FREE' : 'web'} · {exhibit.source}</Chip>
                </div>
              </div>
            </div>
          )}

          <hr style={{ margin: '10px 0', border: 0, borderTop: '1.3px solid rgba(42,36,32,0.16)' }} />
          <div className="row between center">
            <Eyebrow>the jury deliberates — and changes its mind</Eyebrow>
            {deliberationLine && <span className="hand c-moved" style={{ fontSize: 17 }}>“{deliberationLine}”</span>}
          </div>
          <div className="jury-row" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(votes.length, 5)}, 1fr)`, gap: 6, marginTop: 10 }}>
            {votes.map((v) => (
              <div key={v.jurorId} className="col center fade-up" style={{ gap: 2 }}>
                <Character cfg={{ ...faceOf(v.jurorId), seed: seedOf(v.jurorId), tone: 'neutral' }} width={92} />
                <Paddle label={v.verdict} moved={v.moved} scratch={v.moved} warm={v.verdict === 'NTA' && !v.moved} width={46} />
                <span className="hand c-inkf" style={{ fontSize: 13 }}>{v.lens}</span>
              </div>
            ))}
            {votes.length === 0 && <span className="hand c-inkf" style={{ fontSize: 16, gridColumn: '1/-1' }}>the jury is being empanelled…</span>}
          </div>
        </div>

        <div className="col gap16">
          <Ribbon entries={trial.state.record} style={{ height: 440 }} />
          <Gauge rows={gaugeRows(trial)} />
        </div>
      </div>
    </div>
  );
}

function Waiting({ who }: { who: string }) {
  return <div className="ui c-inkf" style={{ fontStyle: 'italic', fontSize: 15 }}>{who} is preparing to speak…</div>;
}

// ── screen 04 — the one human question ───────────────────────────────────────
function QuestionOverlay({ trial }: { trial: Trial }) {
  const q = trial.state.question!;
  const answer = (a: string) => trial.state.caseId && trial.resume(trial.state.caseId, a, trial.state.input);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(234,217,188,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,760px)', gap: 20, alignItems: 'center', maxWidth: 1100 }} className="q-grid">
        <div className="col center">
          <div className="ringing"><Clerk pose="ring" width={190} /></div>
          <span className="hand c-inks" style={{ fontSize: 22 }}>the Clerk rings its bell</span>
        </div>
        <Card accent style={{ padding: 30 }}>
          <Eyebrow>one question before we rule</Eyebrow>
          <div className="disp" style={{ fontSize: 30, margin: '10px 0 18px' }}>{q.question}</div>
          <div className="row gap12 center">
            <Btn primary style={{ fontSize: 22, padding: '14px 34px' }} onClick={() => answer(q.options[0])}>{q.options[0]}</Btn>
            <Btn style={{ fontSize: 22, padding: '14px 34px' }} onClick={() => answer(q.options[1])}>{q.options[1]}</Btn>
            <span className="ui c-inkf" style={{ fontSize: 15 }}>· one clean, binary answer</span>
          </div>
          <hr style={{ margin: '18px 0', border: 0, borderTop: '1.4px solid rgba(42,36,32,0.18)' }} />
          <p className="ui" style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}><b>Why it’s asking.</b> {q.why}</p>
        </Card>
      </div>
    </div>
  );
}

// ── screen 05 — the verdict ──────────────────────────────────────────────────
function VerdictView({ trial, nav }: { trial: Trial; nav: (h: string) => void }) {
  const { verdict, consistency, votes, title, input } = trial.state;
  const [rap, setRap] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRap(true), 350); return () => clearTimeout(t); }, []);
  if (!verdict) return null;
  const share = () => {
    const link = input?.story ? shareLink(input) : location.href;
    const text = `${title} — Hearsay verdict: ${verdict.category} · ${verdict.split}. ${verdict.oneLiner} ${link}`;
    if (navigator.share) navigator.share({ title: 'Hearsay verdict', text }).catch(() => {});
    else { navigator.clipboard?.writeText(text); alert('Verdict copied — drop it in the group chat.'); }
  };
  return (
    <div style={{ paddingTop: 18 }}>
      <Eyebrow style={{ textAlign: 'center' }}>the court has ruled</Eyebrow>
      <div className="col center" style={{ position: 'relative', margin: '14px 0 6px' }}>
        <div className="row center" style={{ gap: 26 }}>
          <BenchBoard verdict={verdict.category} split={verdict.split} size={1.35} />
          <div className={rap ? 'rapping' : ''} style={{ transformOrigin: '80% 80%' }}><Gavel width={92} rot={-38} /></div>
        </div>
        <div className="hand" style={{ fontSize: 26, marginTop: 46 }}>“{verdict.headline}”</div>
        <div className="row center gap8" style={{ marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {votes.map((v) => <Paddle key={v.jurorId} label={v.verdict} moved={v.moved} scratch={v.moved} warm={v.verdict === verdict.category && !v.moved} width={34} />)}
        </div>
        <div className="hand c-inkf" style={{ fontSize: 16, marginTop: 4 }}>{verdict.split.split('-')[0]} {verdict.category} · {verdict.split.split('-')[1]} other · {verdict.moved > 0 ? `${verdict.moved} juror was moved on the record` : 'no minority moved'} · {verdict.calibration}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 22, marginTop: 20 }} className="verdict-grid">
        <Card accent style={{ padding: 26 }}>
          <Eyebrow>the fair path forward</Eyebrow>
          <div className="disp" style={{ fontSize: 26, margin: '6px 0 16px' }}>A way to make peace.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 14px' }}>
            <span className="hand c-ochred" style={{ fontSize: 20 }}>for you →</span><span className="ui" style={{ fontSize: 16, lineHeight: 1.45 }}>{verdict.fairPath.you}</span>
            <span className="hand c-slated" style={{ fontSize: 20 }}>for them →</span><span className="ui" style={{ fontSize: 16, lineHeight: 1.45 }}>{verdict.fairPath.other}</span>
          </div>
          {consistency && (
            <div className="row center gap8" style={{ marginTop: 20, paddingTop: 14, borderTop: '1.3px solid rgba(42,36,32,0.16)' }}>
              <span className="hand c-inks" style={{ fontSize: 19 }}>Same case, told from the other side →</span>
              <SplitFlap value={consistency.povFlip.b} size={0.8} />
              <span className="hand c-ochred" style={{ fontSize: 19 }}>{consistency.povFlip.held ? 'same verdict.' : 'it moved.'}</span>
            </div>
          )}
          <Btn style={{ marginTop: 16 }} onClick={() => nav('#/proof')}>See the proof: Court vs one agent →</Btn>
        </Card>

        <Card style={{ padding: 24 }}>
          <Chip style={{ background: 'var(--paper)', color: 'var(--ochre-deep)', fontSize: 11 }}>VERDICT CARD</Chip>
          <div className="hand c-inks" style={{ fontSize: 24, textAlign: 'center', marginTop: 8 }}>{title}</div>
          <div className="row center" style={{ justifyContent: 'center', gap: 20, margin: '12px 0' }}>
            <SplitFlap value={verdict.category} /><SplitFlap value={verdict.split} pale />
          </div>
          <hr style={{ margin: '8px 0 14px', border: 0, borderTop: '1.3px solid rgba(42,36,32,0.2)' }} />
          <p className="ui" style={{ fontSize: 16, lineHeight: 1.45, textAlign: 'center' }}>“{verdict.oneLiner}”</p>
          <Btn primary style={{ width: '100%', marginTop: 12 }} onClick={share}>Share to the group chat</Btn>
          <div className="row center between" style={{ marginTop: 14 }}>
            <span className="disp" style={{ fontSize: 20 }}>Hearsay</span>
            <span className="hand c-inkf" style={{ fontSize: 16 }}>hear both sides.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── shared ───────────────────────────────────────────────────────────────────
function gaugeRows(trial: Trial): Array<[string, string, string?]> {
  const g = trial.state.gauge;
  return [
    ['status', g?.status || '—', 'var(--ochre-deep)'],
    ['round', g ? `${g.round} / ~${g.roundsEst}` : '—'],
    ['tokens', g ? g.tokens.toLocaleString() : '0', 'var(--ochre-deep)'],
    ['jurors', String(g?.jurors ?? 7)],
    ['moved', String(g?.moved ?? 0), 'var(--moved)'],
  ];
}
