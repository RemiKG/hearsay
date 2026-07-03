import { useEffect, useRef, useState } from 'react';
import type { EngineInfo, DocketCard, CaseInput, InputMode, SuiteCase } from '@shared/types';
import { Card, Btn, Field, Chip, Toggle, Eyebrow } from '../components/ui';
import { Character, Clerk, Chair, Bell, Stamp } from '../art/Sketch';
import { api } from '../lib/api';
import type { useTrial } from '../state/trial';

const PLACEHOLDER = 'Three weeks ago I skipped my sister’s engagement dinner to finish a work launch, and we haven’t really spoken since. I gave four days’ notice and offered to host a make-up dinner…';

export function Intake({ trial, engine, nav }: { trial: ReturnType<typeof useTrial>; engine: EngineInfo | null; nav: (h: string) => void }) {
  const [mode, setMode] = useState<InputMode>('type');
  const [story, setStory] = useState('');
  const [absentName, setAbsentName] = useState('');
  const [invite, setInvite] = useState(false);
  const [image, setImage] = useState<string | undefined>();
  const [examples, setExamples] = useState<DocketCard[]>([]);
  const [stories, setStories] = useState<Record<string, SuiteCase>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.examples().then((e) => { setExamples(e.intake); setStories(e.stories); }).catch(() => {}); }, []);

  const convene = (input?: Partial<CaseInput> & { exampleId?: string }) => {
    const payload: any = input?.exampleId
      ? { exampleId: input.exampleId, mode: 'type' }
      : { story: (input?.story ?? story).trim(), mode, absentName: (input?.absentName ?? absentName) || undefined, inviteOptIn: invite, imageDataUrl: mode === 'screenshot' ? image : undefined };
    if (!payload.exampleId && !payload.story && !payload.imageDataUrl) return;
    trial.start(payload);
    nav('#/trial');
  };

  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  return (
    <div style={{ paddingTop: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1fr)', gap: 40, alignItems: 'start' }} className="intake-grid">
        {/* left — the one action */}
        <div>
          <Eyebrow>tell the court your side</Eyebrow>
          <h1 className="disp" style={{ fontSize: 46, margin: '10px 0 12px' }}>What’s the fight you<br />can’t stop replaying?</h1>
          <p className="ui c-inks" style={{ fontSize: 17, lineHeight: 1.5, maxWidth: 520, margin: '0 0 20px' }}>
            Type it, paste the texts, or snap a screenshot. A lawyer for you, a lawyer for the one who isn’t in the room, and a jury that actually argues.
          </p>

          <div className="row gap8" style={{ marginBottom: 14 }}>
            {(['type', 'paste', 'screenshot'] as InputMode[]).map((m) => (
              <span key={m} onClick={() => setMode(m)} style={{ cursor: 'pointer' }}>
                <Chip on={mode === m} dot={mode === m} dotColor="var(--ochre)">{m === 'type' ? 'Type' : m === 'paste' ? 'Paste the texts' : 'Snap a screenshot'}</Chip>
              </span>
            ))}
          </div>

          {mode !== 'screenshot' ? (
            <Field style={{ padding: 0 }}>
              <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder={PLACEHOLDER}
                style={{ width: '100%', minHeight: 172, resize: 'vertical', border: 'none', outline: 'none', background: 'transparent',
                  padding: '18px 22px', fontFamily: 'Figtree', fontSize: 17, lineHeight: 1.55, color: 'var(--ink)' }} />
            </Field>
          ) : (
            <Field style={{ minHeight: 172, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              {image
                ? <img src={image} alt="screenshot" style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8 }} />
                : <div className="col center" style={{ gap: 8 }}><Bell width={40} /><span className="hand c-inks" style={{ fontSize: 20 }}>drop a screenshot of the argument — read by qwen3-vl</span></div>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] || undefined)} />
            </Field>
          )}

          <div className="row between center" style={{ margin: '18px 0 6px', maxWidth: 560 }}>
            <div>
              <div className="ui" style={{ fontWeight: 600, fontSize: 16 }}>Send them a “tell your side” link</div>
              <div className="ui c-inks" style={{ fontSize: 13 }}>optional — if they don’t, Counsel for the Absent argues for them</div>
            </div>
            <Toggle on={invite} onClick={() => setInvite(!invite)} />
          </div>

          <div className="row center gap16" style={{ marginTop: 18 }}>
            <Btn primary style={{ fontSize: 22, padding: '16px 28px' }} onClick={() => convene()}>Convene the court</Btn>
            <span className={engine?.live ? '' : ''}><Bell width={40} /></span>
          </div>
          <div className="note-honest" style={{ marginTop: 14 }}>A fair-reasoning mediator — not legal advice, not a real court.</div>
        </div>

        {/* right — the court assembles */}
        <div>
          <Eyebrow style={{ textAlign: 'center', marginBottom: 8 }}>the court assembles</Eyebrow>
          <div className="row" style={{ justifyContent: 'space-around', alignItems: 'flex-end' }}>
            <figure style={{ margin: 0, textAlign: 'center', position: 'relative' }}>
              <Character cfg={{ seed: 53, tone: 'neutral', hair: 'bun', gray: true, glasses: true, brow: 'kind', mouth: 'soft', jaw: 'round', wide: true, blouse: true, cheeks: true, skin: '#E9C199' }} width={168} />
              <div style={{ position: 'absolute', right: -6, top: 34 }}><Bell width={40} /></div>
              <figcaption className="hand c-inks" style={{ fontSize: 22, marginTop: 2 }}>the Clerk</figcaption>
            </figure>
            <figure style={{ margin: 0, textAlign: 'center' }}>
              <Character cfg={{ seed: 31, tone: 'warm', hair: 'wavy', brow: 'up', mouth: 'speak', gaze: 1, jaw: 'oval', cheeks: true }} width={150} />
              <figcaption className="hand c-ochred" style={{ fontSize: 20 }}>Counsel for You</figcaption>
            </figure>
            <figure style={{ margin: 0, textAlign: 'center', position: 'relative' }}>
              <Character cfg={{ seed: 42, tone: 'cool', hair: 'side', brow: 'flat', mouth: 'set', jaw: 'square' }} width={150} />
              <div style={{ position: 'absolute', right: -22, bottom: 34 }}><Chair width={54} /></div>
              <figcaption className="hand c-slated" style={{ fontSize: 20 }}>Counsel for the Absent</figcaption>
            </figure>
          </div>
        </div>
      </div>

      {/* bottom — example dockets */}
      <hr style={{ margin: '30px 0 8px', border: 0, borderTop: '1.4px solid rgba(42,36,32,0.2)' }} />
      <Eyebrow>or open a decided case · example dockets</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
        {examples.map((c) => (
          <Card key={c.id} style={{ padding: 16 }}>
            <div className="row between center">
              <Chip style={{ background: 'var(--paper)', color: 'var(--slate-deep)', fontSize: 11 }}>EXAMPLE</Chip>
              <Stamp label={c.verdict} width={110} />
            </div>
            <div className="ui" style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>{c.title}</div>
            <div className="hand c-inks" style={{ fontSize: 16, marginTop: 2 }}>“{stories[c.id]?.story?.slice(0, 60) || c.blurb}…”</div>
            <div className="row between center" style={{ marginTop: 12 }}>
              <span className="ui c-inkf" style={{ fontSize: 12 }}>tap to open</span>
              <span className="ui c-ochred" style={{ fontWeight: 600, fontSize: 12, cursor: 'pointer' }} onClick={() => convene({ exampleId: c.id })}>try your own →</span>
            </div>
            <div style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} onClick={() => convene({ exampleId: c.id })} />
          </Card>
        ))}
        <Card accent style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Bell width={38} />
          <div className="disp c-ochred" style={{ fontSize: 20, marginTop: 6 }}>＋ New fight</div>
          <div className="hand c-inks" style={{ fontSize: 15 }}>type · paste · screenshot</div>
        </Card>
      </div>
    </div>
  );
}
