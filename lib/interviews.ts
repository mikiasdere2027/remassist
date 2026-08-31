/**
 * Interview samples — the recorded clips shown on the top five service pages.
 *
 * The five clips are the ones in `public/uploads/Interviews`; the names below
 * are the ones the files are named after. Poster frames are grabbed from each
 * clip (see `public/images/interviews`) so a card costs one optimised image
 * instead of a video download — the `<video>` element only mounts on click.
 *
 * The slug list has to stay in step with what is actually on disk: a slug with
 * no file gives every service page a card whose video 404s, and the count has
 * to stay at five or `interviewsFor` repeats a face (POSITIONS lists five seats
 * per service). `interviews.test.ts` asserts both against the filesystem.
 *
 * `position` is per service rather than per person: the card's top-left label is
 * the page's own role (the reference design puts the role where a logo would
 * sit), so the seat under the name has to read as a seat on that desk. Swap in
 * the real titles per clip here when the per-service recordings land.
 */
export interface Interviewee {
  /** matches the file name in /uploads/Interviews, minus the extension */
  slug: string;
  name: string;
  /** mm:ss, read off the clip's mvhd duration */
  length: string;
}

/**
 * Source order = the order the clips were uploaded (file mtime).
 *
 * Re-cut 2026-08-28: basleal-abera, nebait-aemro and maereg-hailu were replaced
 * with ermias-lemma, tensae-wubeshet and kalkidan. Lengths are read off each
 * file's mvhd atom, not estimated — there is no ffmpeg in this toolchain, so
 * they are parsed straight out of the MP4 header. Names for Ermias and Kalkidan
 * match the spellings already used in `components/home/TeamRail.tsx`.
 */
export const INTERVIEWS: Interviewee[] = [
  { slug: 'nahom-dereje', name: 'Nahom Dereje', length: '3:50' },
  { slug: 'tensae-wubeshet', name: 'Tensae Wubeshet', length: '2:42' },
  { slug: 'ermias-lemma', name: 'Ermias Lemma', length: '4:23' },
  { slug: 'natty-negash', name: 'Natty Negash', length: '2:33' },
  { slug: 'kalkidan', name: 'Kalkidan Yilkal T.', length: '1:48' },
];

export interface InterviewSeat extends Interviewee {
  position: string;
  video: string;
  poster: string;
}

/** Seats per service, in card order. One entry per clip. */
const POSITIONS: Record<string, string[]> = {
  'sales-and-revenue': [
    'Sales Development Representative',
    'Lead Generation Specialist',
    'Cold Calling Representative',
    'Appointment Setter',
    'Email Outreach Specialist',
  ],
  'customer-service-agents': [
    'Voice Support Agent',
    'Live Chat Agent',
    'Email Support Agent',
    'Technical Support Agent',
    'Quality & Coaching Lead',
  ],
  'finance-and-accounting': [
    'Bookkeeper',
    'Accounts Payable Clerk',
    'Accounts Receivable Clerk',
    'Payroll Preparer',
    'Reconciliation Analyst',
  ],
  'virtual-back-office-team': [
    'Data Entry Specialist',
    'Document Processing Clerk',
    'Claims Processor',
    'Executive Assistant',
    'Order Management Associate',
  ],
  'managed-it': [
    'IT Help Desk Technician',
    'Endpoint & Patching Technician',
    'Security Operations Analyst',
    'Cloud & Backup Administrator',
    'Network Support Technician',
  ],
  /* The directory page is not one desk, so its five seats deliberately come
     from five different ones — the subject of that page is the range itself,
     and five variations on a single role would misrepresent it. */
  'services': [
    'Sales Development Representative',
    'Voice Support Agent',
    'Bookkeeper',
    'IT Help Desk Technician',
    'Executive Assistant',
  ],
};

/** How far the clip order is rotated per service, so no two pages open on the
 *  same face. Fixed rather than random — the markup has to match on the server
 *  and on the client. */
const ROTATION: Record<string, number> = {
  'sales-and-revenue': 0,
  'customer-service-agents': 1,
  'finance-and-accounting': 2,
  'virtual-back-office-team': 3,
  'managed-it': 4,
  /* There are five clips and six pages, so one shift has to repeat. The
     directory shares with Sales & Revenue rather than with a desk page a
     visitor is likely to open in the same session from here. */
  'services': 0,
};

/**
 * The five seats for one service page, clips rotated so each page leads with a
 * different interview.
 */
export function interviewsFor(service: keyof typeof POSITIONS | string): InterviewSeat[] {
  const positions = POSITIONS[service];
  if (!positions) return [];
  const shift = ROTATION[service] ?? 0;
  return positions.map((position, i) => {
    const person = INTERVIEWS[(i + shift) % INTERVIEWS.length];
    return {
      ...person,
      position,
      video: `/uploads/Interviews/${person.slug}.mp4`,
      poster: `/images/interviews/${person.slug}.jpg`,
    };
  });
}
