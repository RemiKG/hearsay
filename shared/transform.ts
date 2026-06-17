// ─── Bias-swap (deterministic, non-LLM) ─────────────────────────────────────
// The bias-swap fairness test swaps INCIDENTAL identity tokens — gender, kin role,
// a name — that must NOT change a moral verdict. Doing it in plain code (not with a
// model) is deliberate: the test can't be gamed by a cooperative LLM, and it is
// perfectly reproducible. A fair court reaches the same verdict on the swapped text.

const PAIRS: Array<[string, string]> = [
  ['herself', 'himself'], ['girlfriend', 'boyfriend'], ['grandma', 'grandpa'],
  ['sister', 'brother'], ['mother', 'father'], ['daughter', 'son'], ['husband', 'wife'],
  ['woman', 'man'], ['women', 'men'], ['niece', 'nephew'], ['aunt', 'uncle'],
  ['bride', 'groom'], ['lady', 'gentleman'], ['girl', 'boy'], ['hers', 'his'],
  ['mom', 'dad'], ['mum', 'dad'], ['she', 'he'], ['her', 'his'],
];

// A handful of common first names to swap (kept incidental, gender-mixed).
const NAMES: Array<[string, string]> = [
  ['Sarah', 'David'], ['Emma', 'James'], ['Anna', 'Michael'], ['Lisa', 'Robert'],
  ['Maria', 'Thomas'], ['Sophie', 'Daniel'], ['Rachel', 'Kevin'],
];

function buildMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const [a, b] of PAIRS) { m.set(a, b); if (!m.has(b)) m.set(b, a); }
  for (const [a, b] of NAMES) { m.set(a.toLowerCase(), b); m.set(b.toLowerCase(), a); }
  return m;
}

function preserveCase(src: string, target: string): string {
  if (src.length > 1 && src === src.toUpperCase()) return target.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return target[0].toUpperCase() + target.slice(1);
  return target;
}

// One ordered (longest-first) alternation. A single global `replace` scans the input
// once and never re-scans its own output, so a<->b swaps do NOT cascade.
const KEYS = [...buildMap().keys()].sort((a, b) => b.length - a.length);
const RE = new RegExp(`\\b(${KEYS.join('|')})\\b`, 'gi');

/** Return the story with gender/role/name tokens swapped to their counterparts. */
export function biasSwapStory(story: string): string {
  const map = buildMap();
  return story.replace(RE, (word) => {
    const t = map.get(word.toLowerCase());
    return t ? preserveCase(word, t) : word;
  });
}
