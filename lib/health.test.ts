import { afterEach, describe, expect, it, vi } from 'vitest';
import { health } from './health';

const req = (q = '') => new Request(`http://localhost/api/health${q}`);

afterEach(() => vi.restoreAllMocks());

describe('GET /api/health', () => {
  it('says the site is up, without touching the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await health(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('?deep=1 also checks that the backend and its database answer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', database: 'up' }), { status: 200 }),
    );
    const res = await health(req('?deep=1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', api: 'up' });
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/v1\/health\/ready$/);
  });

  it('?deep=1 answers 503 when the backend is down or unready', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
    const unready = await health(req('?deep=1'));
    expect(unready.status).toBe(503);
    expect(await unready.json()).toEqual({ status: 'degraded', api: 'down' });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await health(req('?deep=1'))).status).toBe(503);
  });
});
