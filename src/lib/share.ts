// A shareable link encodes the inputs and re-computes — nothing must be stored to
// share a verdict. (base64url of the minimal input.)
import type { CaseInput } from '@shared/types';

export function encodeInput(input: Partial<CaseInput>): string {
  const min = { s: input.story, a: input.absentName, m: input.mode };
  const json = JSON.stringify(min);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInput(enc: string): Partial<CaseInput> | null {
  try {
    const b64 = enc.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const m = JSON.parse(json);
    return { story: m.s, absentName: m.a, mode: m.m || 'type' };
  } catch { return null; }
}

export function shareLink(input: Partial<CaseInput>): string {
  return `${location.origin}/#/share/${encodeInput(input)}`;
}
