// ─── The Docket — decided example cases (clearly labelled), on top of the real path ─
// A judge sees a finished verdict in five seconds. Each card's "try your own" pre-fills
// the SAME fields and runs the SAME live engine — the only convenience is pre-typed input.

import type { DocketCard } from './types.js';

export const EXAMPLE_CARDS: DocketCard[] = [
  { id: 's01', title: 'The Engagement Dinner', blurb: 'skipped my sister’s dinner for a work launch',
    verdict: 'NTA · 5–2', date: 'Jul 7', example: true, faces: [31, 44] },
  { id: 's02', title: 'The 20% Tip', blurb: 'I tipped 10% on slow service and she was mortified',
    verdict: 'YTA · 6–1', date: 'Jul 7', example: true, faces: [112, 42] },
  { id: 's03', title: 'The Group Freeloader', blurb: 'my teammate coasted, so I cut him from the credits',
    verdict: 'ESH · 4–3', date: 'Jul 6', example: true, faces: [123, 53] },
  { id: 's04', title: 'The Dishes War', blurb: 'three weeks of “whose turn is it” with my roommate',
    verdict: 'NAH · 4–3', date: 'Jul 6', example: true, faces: [134, 77] },
  { id: 's05', title: 'The Wedding RSVP', blurb: 'I said yes, then bailed the week of, to save money',
    verdict: 'YTA · 5–2', date: 'Jul 5', example: true, faces: [145, 168] },
];

/** The three headline example dockets shown beneath the intake fold. */
export const INTAKE_EXAMPLES = EXAMPLE_CARDS.slice(0, 3);
