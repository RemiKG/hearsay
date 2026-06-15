// The screen-chrome kit as React components — sketched cards/buttons/fields, the
// reporter's ribbon, the rounds/token gauge, versus bars, and the animated split-flap
// board. Same visual language as the design's UI kit, but live and interactive.
import React, { useEffect, useRef, useState } from 'react';

type Div = React.HTMLAttributes<HTMLDivElement>;

export function Card({ accent, accentSlate, flat, className, children, ...rest }: Div & { accent?: boolean; accentSlate?: boolean; flat?: boolean }) {
  return (
    <div className={`card ${flat ? 'flat' : ''} ${accentSlate ? 'accent-slate' : ''} ${className || ''}`} {...rest}>
      <span className="edge" />
      {(accent || accentSlate) && <div className="accent" />}
      {children}
    </div>
  );
}

export function Btn({ primary, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button className={`btn ${primary ? 'btn-primary' : ''} ${className || ''}`} {...rest}>
      <span className="edge" />
      {children}
    </button>
  );
}

export function Field({ className, children, ...rest }: Div) {
  return <div className={`field ${className || ''}`} {...rest}><span className="edge" />{children}</div>;
}

export function Chip({ on, dot, dotColor, children, className, ...rest }: Div & { on?: boolean; dot?: boolean; dotColor?: string }) {
  return (
    <span className={`chip ${on ? 'on' : ''} ${className || ''}`} {...rest}>
      <span className="edge" />
      {dot && <span className="dot" style={dotColor ? { background: dotColor } : undefined} />}
      {children}
    </span>
  );
}

export function Toggle({ on, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <div className={`toggle ${on ? 'on' : ''}`} onClick={onClick} role="switch" aria-checked={!!on}>
      <span className="edge" /><span className="knob" />
    </div>
  );
}

export const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) =>
  <div className="eyebrow" style={style}>{children}</div>;

// ── the reporter's ribbon (append-only court record, made human) ──
export interface RibbonEntry { who: string; text: string; tone?: 'warm' | 'cool' | 'moved' | 'ink' }
export function Ribbon({ entries, title = 'court record', style }: { entries: RibbonEntry[]; title?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [entries.length]);
  const col = (t?: string) => t === 'warm' ? 'var(--ochre-deep)' : t === 'cool' ? 'var(--slate-deep)' : t === 'moved' ? 'var(--moved)' : 'var(--ink-soft)';
  return (
    <div className="ribbon" style={style}>
      <span className="edge" />
      <div className="rec-head">
        <div className="eyebrow">{title}</div>
        <div className="live-dot" />
      </div>
      <div className="scroll" ref={ref}>
        {entries.length === 0 && <div className="hand c-inkf" style={{ fontSize: 16 }}>the record fills as the court works…</div>}
        {entries.map((e, i) => (
          <div className="entry" key={i}>
            <div className="who" style={{ color: col(e.tone) }}>{e.who}</div>
            <div className="txt">{e.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── the rounds / token gauge ──
export function Gauge({ title = 'the proceeding', rows, style }: { title?: string; rows: Array<[string, string, string?]>; style?: React.CSSProperties }) {
  return (
    <div className="gauge" style={style}>
      <span className="edge" />
      <div className="eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      {rows.map(([k, v, c], i) => (
        <div className="row" key={i}><span className="k">{k}</span><span className="v" style={{ color: c || 'var(--ink)' }}>{v}</span></div>
      ))}
    </div>
  );
}

// ── speech drawn into the scene ──
export function Speech({ side, who, children, style }: { side: 'warm' | 'cool'; who: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`speech ${side} fade-up`} style={style}>
      <span className="edge" />
      <div className="who"><Chip dot dotColor={side === 'warm' ? 'var(--ochre)' : 'var(--slate)'} style={{ background: 'var(--paper-hi)', color: side === 'warm' ? 'var(--ochre-deep)' : 'var(--slate-deep)' }}>{who}</Chip></div>
      <div className="body">{children}</div>
    </div>
  );
}

// ── versus bar (court vs solo) ──
export function VersusBar({ label, court, solo, courtLabel, soloLabel }: { label: string; court: number; solo: number; courtLabel?: string; soloLabel?: string }) {
  return (
    <div className="vbar">
      <div className="lbl">{label}</div>
      <div className="track">
        <div className="bar court" style={{ width: `${Math.max(4, court)}%` }}><span className="edge" /></div>
        <span className="figure c-ochred">{courtLabel || court + '%'}</span>
        <span className="tag c-ochred">court</span>
      </div>
      <div className="track">
        <div className="bar solo" style={{ width: `${Math.max(4, solo)}%` }}><span className="edge" /></div>
        <span className="figure c-slated">{soloLabel || solo + '%'}</span>
        <span className="tag c-slated">solo AI</span>
      </div>
    </div>
  );
}

// ── split-flap numerals (animate a flip when the value changes) ──
export function SplitFlap({ value, pale, size = 1 }: { value: string; pale?: boolean; size?: number }) {
  const [display, setDisplay] = useState(value);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (value === display) return;
    setFlip(true);
    const t1 = setTimeout(() => setDisplay(value), 250);
    const t2 = setTimeout(() => setFlip(false), 520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [value]); // eslint-disable-line
  return (
    <span className="flap" style={{ transform: size !== 1 ? `scale(${size})` : undefined, transformOrigin: 'left center' }}>
      {display.split('').map((ch, i) => ch === ' ' ? <span key={i} style={{ width: 13 }} /> : (
        <span className={`tile ${pale ? 'pale' : ''} ${flip ? 'flipping' : ''}`} key={i}><span className="ch">{ch}</span></span>
      ))}
    </span>
  );
}

export function BenchBoard({ verdict, split, size = 1 }: { verdict: string; split: string; size?: number }) {
  return (
    <div className="bench-board" style={{ transform: size !== 1 ? `scale(${size})` : undefined }}>
      <SplitFlap value={verdict} />
      <SplitFlap value={split} pale />
    </div>
  );
}
