import { describe, expect, it } from 'vitest';
import { safeAdminPath } from './safe-next';

describe('safeAdminPath', () => {
  it('keeps admin paths, including the query', () => {
    expect(safeAdminPath('/admin/leads?status=new')).toBe('/admin/leads?status=new');
    expect(safeAdminPath('/admin')).toBe('/admin');
  });

  it('falls back to /admin for anything else', () => {
    for (const bad of [
      undefined,
      '',
      'https://evil.example/admin',
      '//evil.example',
      '/\\evil.example',
      '/blog',
      '/admin/../blog',
      '/administrator-evil',
    ]) {
      const out = safeAdminPath(bad);
      expect(out === '/admin' || out.startsWith('/admin/')).toBe(true);
      expect(out).not.toMatch(/evil|blog/);
    }
  });
});
