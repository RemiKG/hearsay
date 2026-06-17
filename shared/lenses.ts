// ─── The Jury — distinct value-lenses, not clones ───────────────────────────
// Each juror reasons from a different moral frame. The society's whole advantage
// is that no single frame dominates; a monolith cannot produce this. Seven are
// defined; a panel uses the first 5, 7, or 9 (extras below).

import type { JurorLens } from './types.js';

export const JURORS: JurorLens[] = [
  { id: 'empath', name: 'Empath', frame: 'who got hurt, and how much', seed: 101,
    face: { hair: 'long', brow: 'kind', mouth: 'soft', jaw: 'oval', skin: '#E9C199', cheeks: true, blouse: true } },
  { id: 'stickler', name: 'Stickler', frame: 'what is fair; what the rules and promises were', seed: 112,
    face: { hair: 'side', brow: 'flat', mouth: 'set', glasses: true, jaw: 'square', skin: '#D9A56A' } },
  { id: 'pragmatist', name: 'Pragmatist', frame: 'consequences — what actually works from here', seed: 123,
    face: { hair: 'crop', brow: 'flat', mouth: 'neutral', jaw: 'square', skin: '#CE9866' } },
  { id: 'elder', name: 'Elder', frame: 'loyalty, family, and the long relationship', seed: 134,
    face: { hair: 'bun', gray: true, brow: 'kind', mouth: 'soft', jaw: 'round', wide: true, skin: '#E4B584', blouse: true, cheeks: true } },
  { id: 'freespirit', name: 'Free Spirit', frame: 'autonomy — whose business is this anyway?', seed: 145,
    face: { hair: 'curls', brow: 'up', mouth: 'smile', jaw: 'oval', skin: '#DDA872', cheeks: true } },
  { id: 'cynic', name: 'Cynic', frame: 'what everyone is really after, unsaid', seed: 156,
    face: { hair: 'short', brow: 'flat', mouth: 'neutral', jaw: 'narrow', skin: '#CE9866' } },
  { id: 'idealist', name: 'Idealist', frame: 'the person each of us should try to be', seed: 168,
    face: { hair: 'long', brow: 'kind', mouth: 'neutral', jaw: 'oval', skin: '#E9C199', blouse: true } },
  { id: 'realist', name: 'Realist', frame: 'the messy middle where most conflicts live', seed: 176,
    face: { hair: 'wavy', brow: 'soft', mouth: 'neutral', jaw: 'oval', skin: '#D9A56A' } },
  { id: 'steward', name: 'Steward', frame: 'the health of the group over any one person', seed: 188,
    face: { hair: 'crop', gray: true, brow: 'level', mouth: 'set', jaw: 'square', skin: '#E4B584' } },
];

/** The panel for a given size (5 / 7 / 9). */
export function panelOf(size: number): JurorLens[] {
  const n = Math.max(3, Math.min(JURORS.length, size || 7));
  return JURORS.slice(0, n);
}
