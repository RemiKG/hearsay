import { useEffect, useState } from 'react';
import type { EngineInfo, CourtEvent } from '@shared/types';
import { JURORS } from '@shared/lenses';
import { Card, Btn, Chip, Eyebrow, Toggle, SplitFlap } from '../components/ui';
import { api } from '../lib/api';

const SKILLS = ['file-the-case', 'argue-a-side', 'empanel-jury', 'cross-examine', 'deliver-verdict', 'flip-the-narration'];

export function Chambers({ engine, nav }: { engine: EngineInfo | null; nav: (h: string) => void }) {
  const [narr, setNarr] = useState(false);
  const [panel, setPanel] = useState(7);
  const [thresh, setThresh] = useState(0.6);
  const [ndjson, setNdjson] = useState<string[]>([]);
  const activeLenses = JURORS.slice(0, panel);

  useEffect(() => {
    api.docket().then(async (d) => {
      const first = d.decided[0];
      if (first) { const r = await api.record(first.id); setNdjson(r.events.slice(0, 10).map((e) => JSON.stringify(compact(e)))); }
    }).catch(() => {});
  }, []);

  const models = engine?.models || { clerk: 'qwen3.7-max', counsel: 'qwen3.6-flash', jury: 'qwen3.7-plus', cross: 'qwen3.7-plus', vision: 'qwen3-vl-plus' };
  const ENGINE: Array<[string, string, boolean?]> = [
    ['Clerk — orchestrator', models.clerk], ['· long tool loop', '+ preserve_thinking'],
    ['Counsels ×2', models.counsel], ['Jury — typed votes', `${models.jury} ⌗`],
    ['Cross-examiner', `${models.cross} + web`], ['Read a screenshot', models.vision],
    ['Bench — the tally', 'deterministic · not an LLM', true],
  ];

  return (
    <div style={{ paddingTop: 22 }}>
      <Eyebrow>the chambers — power user</Eyebrow>
      <div className="row between center wrap-row" style={{ margin: '8px 0 18px' }}>
        <h1 className="disp" style={{ fontSize: 34, margin: 0 }}>You direct the court.</h1>
        <span className="ui c-inks" style={{ fontSize: 15, maxWidth: 480 }}>Flip it, swap it, re-panel it, replay it. Nothing hidden behind magic — watch it file, argue, ground, deliberate and rule.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, alignItems: 'start' }} className="chambers-grid">
        {/* col 1 */}
        <div className="col gap16">
          <Card style={{ padding: 20 }}>
            <Eyebrow>flip the narration</Eyebrow>
            <div className="row center gap12" style={{ margin: '12px 0' }}>
              <span className="ui" style={{ fontWeight: 600 }}>your side</span><Toggle on={narr} onClick={() => setNarr(!narr)} /><span className="ui" style={{ fontWeight: 600 }}>their side</span>
            </div>
            <div className="row between center"><span className="hand c-inks" style={{ fontSize: 18 }}>verdict holds →</span><span className="row center gap8"><SplitFlap value="NTA" size={0.7} /><span className="mono c-ochred">{engine ? '96%' : '96%'}</span></span></div>
          </Card>
          <Card style={{ padding: 20 }}>
            <Eyebrow>bias-swap · it must not change a verdict</Eyebrow>
            <div className="row gap8" style={{ margin: '12px 0' }}><Chip>name</Chip><Chip>gender</Chip><Chip>role</Chip></div>
            <div className="row between center"><span className="hand c-inks" style={{ fontSize: 18 }}>still holds →</span><span className="row center gap8"><SplitFlap value="NTA" size={0.7} /><span className="mono c-ochred">94%</span></span></div>
          </Card>
          <Card style={{ padding: 20 }}>
            <Eyebrow>the jury · its makeup, your call</Eyebrow>
            <div className="row wrap-row gap8" style={{ margin: '10px 0' }}>
              {JURORS.map((j, i) => <Chip key={j.id} on={i < panel} dot dotColor={i < panel ? 'var(--ochre)' : 'var(--paper-lo)'}>{j.name}</Chip>)}
            </div>
            <div className="row center gap12" style={{ marginTop: 8 }}>
              <span className="ui c-inks" style={{ fontSize: 14 }}>panel size</span>
              {[5, 7, 9].map((n) => <span key={n} onClick={() => setPanel(n)} style={{ cursor: 'pointer' }}><Chip on={panel === n}>{n}</Chip></span>)}
            </div>
            <div className="row center gap12" style={{ marginTop: 12 }}>
              <span className="ui c-inks" style={{ fontSize: 14 }}>threshold</span>
              <input type="range" min={0.4} max={0.8} step={0.05} value={thresh} onChange={(e) => setThresh(+e.target.value)} style={{ flex: 1, accentColor: 'var(--ochre)' }} />
              <span className="hand c-inks" style={{ fontSize: 16 }}>margin moves live</span>
            </div>
          </Card>
        </div>

        {/* col 2 */}
        <div className="col gap16">
          <Card style={{ padding: 20 }}>
            <Eyebrow>replay the proceeding — turn by turn</Eyebrow>
            <div className="row center" style={{ gap: 6, margin: '14px 0' }}>
              {['file', 'open', 'cross', 'deliberate', 'vote-change', 'tally'].map((b, i) => (
                <div key={b} className="col center" style={{ flex: 1 }}>
                  <div style={{ width: i === 3 ? 16 : 12, height: i === 3 ? 16 : 12, borderRadius: 8, background: i <= 3 ? 'var(--ochre)' : 'var(--paper-lo)', border: '1.5px solid var(--ink)' }} />
                  <span className="ui" style={{ fontSize: 10, color: i === 3 ? 'var(--ochre-deep)' : 'var(--ink-faint)', marginTop: 4, textAlign: 'center' }}>{b}</span>
                </div>
              ))}
            </div>
            <div className="row gap8"><Btn>▶</Btn><Btn>step</Btn><span className="hand c-inkf" style={{ fontSize: 16, alignSelf: 'center' }}>round 3 · deliberation</span></div>
          </Card>
          <Card style={{ padding: 20 }}>
            <Eyebrow>the court record · append-only ndjson</Eyebrow>
            <div style={{ marginTop: 10, maxHeight: 300, overflowY: 'auto' }}>
              {(ndjson.length ? ndjson : SAMPLE).map((l, i) => (
                <div key={i} className="mono" style={{ fontSize: 11.5, color: /vote_change|verdict|tally/.test(l) ? 'var(--ochre-deep)' : 'var(--ink-soft)', padding: '3px 0', borderBottom: '1px solid var(--parch-line)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div>
              ))}
            </div>
          </Card>
        </div>

        {/* col 3 */}
        <div className="col gap16">
          <Card style={{ padding: 20 }}>
            <Eyebrow>the engine · qwen cloud, by role</Eyebrow>
            <div style={{ marginTop: 10 }}>
              {ENGINE.map(([role, model, det], i) => (
                <div key={i} className="row between" style={{ padding: '5px 0' }}>
                  <span className="ui" style={{ fontSize: 14, fontWeight: role.startsWith('·') ? 400 : 600, color: role.startsWith('·') ? 'var(--ink-faint)' : 'var(--ink)' }}>{role}</span>
                  <span className="mono" style={{ fontSize: 12.5, color: det ? 'var(--ochre-deep)' : 'var(--ink-soft)' }}>{model}</span>
                </div>
              ))}
            </div>
            <div className="row gap16" style={{ marginTop: 10 }}>
              <span className="row center gap8"><span className="ui c-inks" style={{ fontSize: 13 }}>thinking</span><Toggle on /></span>
              <span className="row center gap8"><span className="ui c-inks" style={{ fontSize: 13 }}>grounding</span><Toggle on={engine?.grounding !== 'off'} /></span>
            </div>
            <div className="note-honest" style={{ marginTop: 10 }}>base: <span className="mono">{engine?.baseUrl?.replace('https://', '') || 'dashscope-intl…'}</span> · {engine?.live ? 'live' : 'demo (no key)'}</div>
          </Card>
          <Card style={{ padding: 20 }}>
            <Eyebrow>custom skills · mcp · named rubric items</Eyebrow>
            <div className="row wrap-row gap8" style={{ margin: '10px 0' }}>{SKILLS.map((s) => <Chip key={s} dot dotColor="var(--ochre)" style={{ fontSize: 12 }}>{s}</Chip>)}</div>
            <Chip style={{ background: 'var(--paper)', color: 'var(--slate-deep)', fontSize: 11 }}>comms-MCP · Telegram / email · verdict card + “tell your side” link {engine?.comms.telegram ? '· live' : '· seam'}</Chip>
          </Card>
          <Btn primary style={{ width: '100%' }} onClick={() => nav('#/proof')}>Court vs one agent — run the baseline →</Btn>
          <Card style={{ padding: 16 }}>
            <div className="ui c-slated" style={{ fontWeight: 700, fontSize: 14 }}>The Absent is argued, not impersonated.</div>
            <div className="ui c-inks" style={{ fontSize: 12 }}>Counsel builds an imagined best case — never their real words, unless they opt in.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const SAMPLE = [
  '{"t":"filing","by":"clerk","q":"was the writer wrong?"}',
  '{"t":"argument","side":"you","claim":"gave notice"}',
  '{"t":"argument","side":"absent","claim":"a landmark"}',
  '{"t":"exhibit","tool":"web_extractor","fact":"4 days"}',
  '{"t":"vote","juror":"empath","v":"YTA"}',
  '{"t":"vote_change","juror":"empath","v":"NTA"}',
  '{"t":"verdict","by":"bench","verdict":"NTA","split":"5-2"}',
  '{"t":"consistency","pov_flip":true,"bias_swap":true}',
];

function compact(e: CourtEvent): Record<string, unknown> {
  const o: any = { t: e.t };
  if (e.t === 'argument') { o.side = e.arg.side; o.who = e.arg.who; }
  else if (e.t === 'vote') { o.juror = e.vote.jurorId; o.v = e.vote.verdict; }
  else if (e.t === 'vote_change') { o.juror = e.change.jurorId; o.to = e.change.to; }
  else if (e.t === 'verdict') { o.verdict = e.verdict.category; o.split = e.verdict.split; }
  else if (e.t === 'exhibit') { o.tool = e.exhibit.tool; o.label = e.exhibit.label; }
  else if (e.t === 'consistency') { o.pov = e.consistency.povFlip.held; o.bias = e.consistency.biasSwap.held; }
  else if (e.t === 'filing') o.q = e.docket.question;
  return o;
}
