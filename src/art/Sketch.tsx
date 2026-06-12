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

