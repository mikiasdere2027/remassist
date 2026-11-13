/**
 * The four onboarding phases, as data.
 *
 * The copy is unchanged from the hand-written <ol> this replaced in
 * app/how-it-works/page.tsx — same wording, same order, same two columns of
 * commitments. Only the shape moved: PhaseScroller renders one phase at a
 * time, and four near-identical blocks of markup differing solely in their
 * content is exactly the thing that belongs in a list rather than in JSX.
 *
 * `when` is the phase's place in the calendar and it has to keep agreeing with
 * the day-by-day strip further down the page — "Days 3–5" here and "Day 4
 * Profiles sent / Day 5 You approve" there are the same claim written twice.
 *
 * The photographs are hotlinked from Unsplash rather than committed to
 * public/images. They are stock scenery for a process diagram, not pictures of
 * this company or its staff, and putting them in the repo would say otherwise
 * to anyone browsing it. The Unsplash licence permits hotlinking and their CDN
 * is what serves them everywhere else; images.unsplash.com is allow-listed for
 * next/image in next.config.ts, so replacing one with a real photograph later
 * is a one-line change here. Swap them for /images/… the moment we have our
 * own — an invented scene is only tolerable while it is obviously generic.
 */
export interface Phase {
  /** Anchor id, so a phase can be linked to directly. */
  id: string;
  /** Two-digit label. Written out rather than derived from the index so the
      numbering is visible in the data being read, not in a padStart call. */
  n: string;
  title: string;
  /** Calendar position, printed in the pill above the title. */
  when: string;
  blurb: string;
  /** What Rem Assist commits to in this phase. */
  we: string[];
  /** What the client has to supply for it. */
  you: string[];
  photo: { src: string; alt: string };
}

/** Unsplash serves any size from one photo id; ask for a wide source and let
    next/image cut the responsive variants from it. */
const shot = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=70`;

export const PHASES: Phase[] = [
  {
    id: 'consultation',
    n: '01',
    title: 'Free consultation',
    when: 'Day 1 · 30–45 min',
    blurb:
      'You tell us the work that is piling up and the volume behind it. We tell you the seats, '
      + 'the tier and the rate for your hours — and if we are not the right fit, we say so on the '
      + 'call rather than three weeks later.',
    we: [
      'Map the function to seats and coverage',
      'Give you the exact rate, not a range',
      'Flag anything we think you should not outsource',
    ],
    you: [
      'Rough interaction or transaction volume',
      'The hours you actually need covered',
      'Which tools the work lives in',
    ],
    photo: {
      src: shot('1551836022-d5d88e9218df'),
      alt: 'Two people talking across a meeting table, one taking notes beside an open laptop',
    },
  },
  {
    id: 'team-design',
    n: '02',
    title: 'Team design',
    when: 'Days 2–3',
    blurb:
      'We scope the personnel mix — generalists, specialists, or both — and put the pricing and '
      + 'terms in writing. This is also where we decide whether a mixed-tier pod is cheaper for you '
      + 'than a single senior seat.',
    we: [
      'Design the pod shape and the rota',
      'Confirm pricing and terms in writing',
      'Name the supervisor who will own the account',
    ],
    you: [
      'Any SOPs or notes that already exist',
      'Your escalation rules and SLAs, if you have them',
      'One person who can approve decisions',
    ],
    photo: {
      src: shot('1552664730-d307ca884978'),
      alt: 'A planning session in a bright room, one person working through a wall of sticky notes',
    },
  },
  {
    id: 'pick-agents',
    n: '03',
    title: 'Pick your agents',
    when: 'Days 3–5',
    blurb:
      'Real profiles at the tiers you scoped. Interview them yourself, or leave the selection to '
      + 'our team and approve the shortlist. Nobody is assigned to your account without your '
      + 'sign-off — that is the part most of this industry skips.',
    we: [
      'Shortlist from the bench against your criteria',
      'Set up interviews, or recommend and explain why',
      'Hold profiles if your start date is later',
    ],
    you: [
      'An hour or so for interviews, if you want them',
      'Approval on the shortlist',
      'Scoped access to the tools they will work in',
    ],
    photo: {
      src: shot('1454165804606-c3d57bc86b40'),
      alt: 'Two colleagues going through printed pages together at a desk between two laptops',
    },
  },
  {
    id: 'training',
    n: '04',
    title: 'Monitored training and delivery',
    when: 'Week 2 onward',
    blurb:
      'Full training against your process, then live work under supervision. If your process was '
      + 'never written down, we document it as we go and hand the SOP to you — you keep it whether '
      + 'or not you stay with us.',
    we: [
      'Train on your product, macros and tone',
      'Write or rewrite the SOP and hand it over',
      'Hourly work logs and daily email reports',
    ],
    you: [
      'A named contact for questions in week one',
      'Feedback on the first few days of output',
      'Nothing else. That is rather the point.',
    ],
    photo: {
      src: shot('1524178232363-1fb2b075b655'),
      alt: 'A training session in progress, a presenter at a screen in front of a seated group',
    },
  },
];
