import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INTERVIEWS, interviewsFor } from './interviews';

/**
 * The interview list against the filesystem.
 *
 * This exists because the list drifted: three clips were replaced on disk and
 * `INTERVIEWS` kept naming the old slugs, so three of the five cards on every
 * service page pointed at a video and a poster that 404'd. Nothing caught it —
 * the pages still rendered, the cards still looked right, and the failure only
 * showed on click. Asserting against the real directories is the only check
 * that would have.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const VIDEO_DIR = path.join(ROOT, 'public/uploads/Interviews');
const POSTER_DIR = path.join(ROOT, 'public/images/interviews');

const SERVICES = [
  'sales-and-revenue',
  'customer-service-agents',
  'finance-and-accounting',
  'virtual-back-office-team',
  'managed-it',
  'services',
];

describe('interview clips exist on disk', () => {
  it.each(INTERVIEWS)('$slug has its video', ({ slug }) => {
    expect(existsSync(path.join(VIDEO_DIR, `${slug}.mp4`))).toBe(true);
  });

  it.each(INTERVIEWS)('$slug has its poster', ({ slug }) => {
    expect(existsSync(path.join(POSTER_DIR, `${slug}.jpg`))).toBe(true);
  });

  /* The other direction: a clip dropped in but never listed is invisible on the
     site, and a poster left behind after a re-cut is dead weight in the bundle. */
  it('lists every clip in the directory, with no extras', () => {
    const onDisk = readdirSync(VIDEO_DIR)
      .filter((f) => f.toLowerCase().endsWith('.mp4'))
      .map((f) => f.replace(/\.mp4$/i, ''))
      .sort();
    expect(INTERVIEWS.map((i) => i.slug).sort()).toEqual(onDisk);
  });

  it('leaves no orphaned posters behind', () => {
    const posters = readdirSync(POSTER_DIR)
      .filter((f) => f.toLowerCase().endsWith('.jpg'))
      .map((f) => f.replace(/\.jpg$/i, ''))
      .sort();
    expect(posters).toEqual(INTERVIEWS.map((i) => i.slug).sort());
  });
});

describe('the list is shaped the way interviewsFor assumes', () => {
  /* POSITIONS gives five seats per service and interviewsFor indexes the people
     modulo the list length, so any count but five silently repeats a face on
     every page. */
  it('holds exactly five people', () => {
    expect(INTERVIEWS).toHaveLength(5);
  });

  it('has no duplicate slugs', () => {
    expect(new Set(INTERVIEWS.map((i) => i.slug)).size).toBe(INTERVIEWS.length);
  });

  it('gives every length as mm:ss', () => {
    for (const { slug, length } of INTERVIEWS) {
      expect(length, slug).toMatch(/^\d{1,2}:[0-5]\d$/);
    }
  });

  it.each(SERVICES)('%s shows five distinct people', (service) => {
    const seats = interviewsFor(service);
    expect(seats).toHaveLength(5);
    expect(new Set(seats.map((s) => s.slug)).size).toBe(5);
  });

  /* Once there are more service pages than clips, some pages must share a lead
     face — so this asserts the rotation spreads them as far as the clip count
     allows, rather than a flat count that would have to be edited down every
     time a page is added. A rotation that collapsed to one lead still fails. */
  it('spreads the lead interview as widely as the clip count allows', () => {
    const leads = SERVICES.map((s) => interviewsFor(s)[0].slug);
    expect(new Set(leads).size).toBe(Math.min(SERVICES.length, INTERVIEWS.length));
  });

  it('builds paths that match the files on disk', () => {
    for (const seat of interviewsFor('sales-and-revenue')) {
      expect(existsSync(path.join(ROOT, 'public', seat.video))).toBe(true);
      expect(existsSync(path.join(ROOT, 'public', seat.poster))).toBe(true);
    }
  });

  it('returns nothing for a service with no seats defined', () => {
    expect(interviewsFor('not-a-service')).toEqual([]);
  });
});
