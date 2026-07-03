import { useEffect, useState } from 'react';
import type { DocketCard } from '@shared/types';
import { Card, Btn, Chip, Eyebrow } from '../components/ui';
import { Character, Bell, Stamp } from '../art/Sketch';
import { api } from '../lib/api';
import type { useTrial } from '../state/trial';

type Trial = ReturnType<typeof useTrial>;

export function Docket({ trial, nav }: { trial: Trial; nav: (h: string) => void }) {
  const [decided, setDecided] = useState<DocketCard[]>([]);
  const [examples, setExamples] = useState<DocketCard[]>([]);
  useEffect(() => { api.docket().then((d) => { setDecided(d.decided); setExamples(d.examples); }).catch(() => {}); }, []);
  const all = [...decided, ...examples.filter((e) => !decided.some((d) => d.title === e.title))];

  const open = (c: DocketCard) => {
    if (c.example) { trial.start({ exampleId: c.id, mode: 'type' } as any); nav('#/trial'); }
    else nav(`#/case/${c.id}`);
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <Eyebrow>the docket — every case, pinned</Eyebrow>
      <div className="row between center wrap-row" style={{ margin: '8px 0 20px' }}>
        <h1 className="disp" style={{ fontSize: 34, margin: 0 }}>The cases you put on trial.</h1>
        <span className="ui c-inks" style={{ fontSize: 16, maxWidth: 520 }}>Re-open, replay the deliberation, or re-share the verdict card. Examples are clearly labelled.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {all.map((c) => (
          <Card key={c.id + c.title} style={{ padding: 18, cursor: 'pointer' }} onClick={() => open(c)}>
            <div className="row between center">
              {c.example ? <Chip style={{ background: 'var(--paper)', color: 'var(--slate-deep)', fontSize: 11 }}>EXAMPLE</Chip> : <span />}
              <Stamp label={c.verdict} width={140} />
            </div>
            <div className="row gap8" style={{ margin: '6px 0' }}>
              <Character cfg={{ seed: c.faces[0], tone: 'warm', hair: 'wavy', jaw: 'oval', mouth: 'set' }} width={52} />
              <Character cfg={{ seed: c.faces[1], tone: 'cool', hair: 'side', jaw: 'square', mouth: 'set' }} width={52} />
            </div>
            <div className="hand" style={{ fontSize: 24 }}>{c.title}</div>
            {c.blurb && <div className="hand c-inks" style={{ fontSize: 16 }}>“{c.blurb}”</div>}
            <hr style={{ margin: '12px 0 8px', border: 0, borderTop: '1.3px solid rgba(42,36,32,0.16)' }} />
            <div className="row between center">
              <span className="mono c-inkf" style={{ fontSize: 13 }}>{c.date}</span>
              <span className="ui c-ochred" style={{ fontSize: 13, fontWeight: 600 }}>re-open · replay · share</span>
            </div>
          </Card>
        ))}
        <Card accent style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 220 }} onClick={() => nav('#/')}>
          <Bell width={44} />
          <div className="disp c-ochred" style={{ fontSize: 22, marginTop: 8 }}>＋ Put a new fight on trial</div>
          <div className="hand c-inks" style={{ fontSize: 17 }}>type · paste the texts · snap a screenshot</div>
        </Card>
      </div>
    </div>
  );
}
