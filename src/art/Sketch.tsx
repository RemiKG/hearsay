// Thin React wrappers around the ported SK engine. Static procedural art (characters,
// the Clerk, bell, gavel, chair, stamps, wordmark, logomark, paddles) is rendered as
// inline SVG that references the globally-injected filters in <PaperDefs/>.
import { SK } from '../lib/sketch';

/** Inject the sketch filters (#chalk, #rghF, #smudge, #paper, #vgrad, #flapGrad…) once. */
export function PaperDefs() {
  const html = SK.defs().replace('</defs>', `${SK.vignetteGrad(1440, 960)}${SK.flapGrad()}</defs>`);
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden dangerouslySetInnerHTML={{ __html: html }} />
  );
}

interface RawProps { svg: string; vb: string; width?: number | string; height?: number | string; className?: string; style?: React.CSSProperties; }
export function Sketch({ svg, vb, width, height, className, style }: RawProps) {
  return (
    <svg viewBox={vb} width={width} height={height} className={`svg-art ${className || ''}`} style={style}
      preserveAspectRatio="xMidYMid meet" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

// ── characters ──────────────────────────────────────────────────────────────
export function Character({ cfg, width = 130, className, style }: { cfg: Record<string, unknown>; width?: number; className?: string; style?: React.CSSProperties }) {
  return <Sketch vb="0 0 110 206" width={width} svg={SK.head({ ...cfg, x: 0, y: 0, s: 1 })} className={className} style={style} />;
}

export function Clerk({ pose = 'preside', width = 130, className, style }: { pose?: string; width?: number; className?: string; style?: React.CSSProperties }) {
  return <Sketch vb="0 0 118 206" width={width} svg={SK.clerk({ x: 0, y: 0, s: 1, pose })} className={className} style={style} />;
}

export function Bell({ width = 44, className, style }: { width?: number; className?: string; style?: React.CSSProperties }) {
  return <Sketch vb="4 0 32 44" width={width} svg={SK.bell(20, 34, 1)} className={className} style={style} />;
}

export function Gavel({ width = 110, rot = -22, className, style }: { width?: number; rot?: number; className?: string; style?: React.CSSProperties }) {
  return <Sketch vb="-6 -30 100 60" width={width} svg={SK.gavel(20, 0, 1, rot)} className={className} style={style} />;
}

export function Chair({ width = 70, tone = 'cool', className }: { width?: number; tone?: string; className?: string }) {
  return <Sketch vb="-32 -44 64 96" width={width} svg={SK.chair(0, 0, 1, tone)} className={className} />;
}

export function Stamp({ label, width = 150, rot = -6, className }: { label: string; width?: number; rot?: number; className?: string }) {
  const w = Math.max(120, 20 + label.length * 9);
  return <Sketch vb={`-4 -6 ${w + 8} 46`} width={width} svg={SK.stamp(0, 0, label, { w, rot })} className={className} />;
}

export function Wordmark({ width = 380, className }: { width?: number; className?: string }) {
  return <Sketch vb="20 10 500 165" width={width} svg={SK.wordmark({})} className={className} />;
}

export function Logomark({ width = 120, className }: { width?: number; className?: string }) {
  return <Sketch vb="0 0 90 90" width={width} svg={SK.logoH(45, 45, 22, SK.P.ochre, SK.P.slate, SK.P.ink, SK.P.ink)} className={className} />;
}

/** A juror vote-paddle. `moved` renders sage; `scratch` draws the crossed-out old mark. */
export function Paddle({ label, moved, warm, scratch, width = 56, className, style }: { label: string; moved?: boolean; warm?: boolean; scratch?: boolean; width?: number; className?: string; style?: React.CSSProperties }) {
  return <Sketch vb="-22 -30 44 66" width={width} svg={SK.paddle(0, 0, label, { moved, warm, scratch, seed: 90 + label.charCodeAt(0) })} className={className} style={style} />;
}
