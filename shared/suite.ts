// ─── The seeded suite — ~30 public-style dilemmas with known crowd-consensus ─
// A LABELLED DEMONSTRATION, not a published benchmark (small-N, disclosed in-app).
// `crowd` is the reasonable-person consensus label — a proxy for morality, not
// morality itself. The suite backs the reported crowd-agreement metric and, when
// no live key is present, a deterministic demo run whose aggregates the Bench still
// computes from the rows below (never a hardcoded percentage).

import type { SuiteCase, SuiteRow, VerdictCategory } from './types.js';
import { CATEGORIES } from './bench.js';

export const SUITE: SuiteCase[] = [
  { id: 's01', title: 'The Engagement Dinner', category: 'family', crowd: 'NTA', absentName: 'my sister',
    story: 'I skipped my sister’s engagement dinner to finish a work launch. I gave four days’ notice and offered a make-up dinner. We haven’t spoken since.' },
  { id: 's02', title: 'The 20% Tip', category: 'money', crowd: 'YTA', absentName: 'my date',
    story: 'Service was slow but polite, so I tipped 10%. My date was mortified and quietly added cash when I went to the restroom.' },
  { id: 's03', title: 'The Group Freeloader', category: 'workplace', crowd: 'ESH', absentName: 'my teammate',
    story: 'A teammate coasted on the group project, so I cut his name from the final credits without telling him first.' },
  { id: 's04', title: 'The Dishes War', category: 'roommate', crowd: 'NAH', absentName: 'my roommate',
    story: 'Three weeks of “whose turn is it” with my roommate. I finally left his dishes in his bed as a joke that did not land.' },
  { id: 's05', title: 'The Wedding RSVP', category: 'relationship', crowd: 'YTA', absentName: 'the bride',
    story: 'I RSVP’d yes, then bailed the week of the wedding to save money on the flight, after they’d paid for my plated meal.' },
  { id: 's06', title: 'The Borrowed Car', category: 'family', crowd: 'NTA', absentName: 'my brother',
    story: 'My brother returned my car with an empty tank and a new scratch, then got angry when I asked him to cover the repair.' },
  { id: 's07', title: 'The Baby Shower Invoice', category: 'money', crowd: 'YTA', absentName: 'my cousin',
    story: 'I hosted a baby shower and afterward sent every guest a Venmo request to split the cost, without warning them beforehand.' },
  { id: 's08', title: 'The Quiet Quitter', category: 'workplace', crowd: 'NAH', absentName: 'my manager',
    story: 'I stopped answering Slack after 6pm and only do my exact job description now. My manager says the team feels I checked out.' },
  { id: 's09', title: 'The Split Bill', category: 'money', crowd: 'NTA', absentName: 'the table',
    story: 'I ordered a salad and water; the table wanted to split the bill evenly across steaks and cocktails. I paid only for mine.' },
  { id: 's10', title: 'The Spoiler', category: 'relationship', crowd: 'YTA', absentName: 'my partner',
    story: 'My partner asked me not to spoil the finale. I “accidentally” let the ending slip because I was annoyed they watched ahead once.' },
  { id: 's11', title: 'The Family Recipe', category: 'family', crowd: 'ESH', absentName: 'my aunt',
    story: 'I posted grandma’s “secret” recipe online. My aunt says it wasn’t mine to share; I say gatekeeping a soup is ridiculous.' },
  { id: 's12', title: 'The Thermostat', category: 'roommate', crowd: 'NAH', absentName: 'my roommate',
    story: 'I keep the flat at 19°C to save money; my roommate is always cold and bought a space heater that spiked the electric bill.' },
  { id: 's13', title: 'The Promotion', category: 'workplace', crowd: 'NTA', absentName: 'my colleague',
    story: 'A colleague asked me to withdraw from a promotion because she “needed it more.” I applied anyway and got it.' },
  { id: 's14', title: 'The Loan That Wasn’t', category: 'money', crowd: 'NTA', absentName: 'my friend',
    story: 'I lent a friend £400 “until payday.” Six months later I asked for it back and she called me greedy in the group chat.' },
  { id: 's15', title: 'The Plus-One', category: 'relationship', crowd: 'YTA', absentName: 'my best friend',
    story: 'I brought an uninvited plus-one to my best friend’s small dinner party because I “didn’t want to come alone.”' },
