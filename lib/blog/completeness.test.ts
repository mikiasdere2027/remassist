import { describe, expect, it } from 'vitest';
import { listFields, missingForPublish, type PostForPublish } from './completeness';

const complete: PostForPublish = {
  slug: 'how-to-hire',
  title: 'How to hire',
  excerpt: 'A short line for the card.',
  category: 'Hiring Strategy',
  date: '2026-09-08',
  readTime: '5 min read',
  image: '/images/blog/cover.jpg',
  authorName: 'Johnathan M.',
  authorAvatar: '/images/teams/Johnathan.jpg',
  body: '<p>Words.</p>',
};

describe('missingForPublish', () => {
  it('is empty for a complete post', () => {
    expect(missingForPublish(complete)).toEqual([]);
  });

  it('names every empty field, in editor order', () => {
    expect(
      missingForPublish({ ...complete, image: '', title: '', authorAvatar: '' }),
    ).toEqual(['Title', 'Cover image', 'Author avatar']);
  });

  it('treats whitespace as empty', () => {
    expect(missingForPublish({ ...complete, readTime: '   ' })).toEqual(['Read time']);
  });

  it('requires a body', () => {
    expect(missingForPublish({ ...complete, body: null })).toEqual(['Body']);
    expect(missingForPublish({ ...complete, body: '   ' })).toEqual(['Body']);
  });

  it('accepts the one post whose body still lives in a component', () => {
    expect(
      missingForPublish({
        ...complete,
        slug: 'hiring-offshore-without-losing-quality-control',
        body: null,
      }),
    ).toEqual([]);
  });
});

describe('listFields', () => {
  it('reads as a sentence', () => {
    expect(listFields([])).toBe('');
    expect(listFields(['Title'])).toBe('Title');
    expect(listFields(['Title', 'Body'])).toBe('Title and Body');
    expect(listFields(['Title', 'Cover image', 'Body'])).toBe('Title, Cover image and Body');
  });
});
