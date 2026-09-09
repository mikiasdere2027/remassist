import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  CONSENT_DEFAULT_SCRIPT,
  ga4InitScript,
  gtmInitScript,
  isContainerId,
  isMeasurementId,
} from './tag-script';

/**
 * These snippets are JavaScript that only ever runs as text inside HTML, so
 * nothing type-checks them and a missing brace is not a build failure — it is
 * a tag that silently never loads, on production, weeks later. So the test
 * executes them: each one runs in a throwaway context with a stub `document`,
 * and the assertions are about what ended up queued and in what order.
 *
 * `window` is the sandbox itself, which is how the page sees it: the snippets
 * write `window.dataLayer` and then read bare `dataLayer`.
 */
function run(script: string, extra: Record<string, unknown> = {}): unknown[] {
  const sandbox: Record<string, unknown> = { ...extra };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  return (sandbox.dataLayer ?? []) as unknown[];
}

/** A queued gtag call, flattened from the Arguments object it arrives as. */
function call(entry: unknown): unknown[] {
  expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
  return Array.from(entry as ArrayLike<unknown>);
}

/** Just enough DOM for GTM's loader, which injects a <script> beside one. */
function stubDocument() {
  const injected: Record<string, unknown>[] = [];
  const sibling = { parentNode: { insertBefore: (node: Record<string, unknown>) => injected.push(node) } };
  return {
    injected,
    document: {
      getElementsByTagName: () => [sibling],
      createElement: () => ({}) as Record<string, unknown>,
    },
  };
}

describe('the consent defaults', () => {
  it('deny every storage a visitor has to agree to, and grant only the rest', () => {
    const [first] = run(CONSENT_DEFAULT_SCRIPT);
    expect(call(first)).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted',
        wait_for_update: 500,
      },
    ]);
  });
});

describe('the GA4 snippet', () => {
  it('queues the defaults before the config, which is the whole point of the ordering', () => {
    const queue = run(ga4InitScript('G-TESTONLY'));
    expect(queue.map((e) => call(e)[0])).toEqual(['consent', 'js', 'config']);
  });

  it('configures the measurement id it was given', () => {
    const queue = run(ga4InitScript('G-TESTONLY'));
    expect(call(queue[2])).toEqual(['config', 'G-TESTONLY']);
  });
});

describe('the GTM snippet', () => {
  it('queues the defaults before gtm.start, so the container starts denied', () => {
    const { document } = stubDocument();
    const queue = run(gtmInitScript('GTM-TESTONLY'), { document });
    expect(call(queue[0])[0]).toBe('consent');
    expect(queue[1]).toMatchObject({ event: 'gtm.js' });
  });

  it('injects the container loader for the id it was given', () => {
    const { document, injected } = stubDocument();
    run(gtmInitScript('GTM-TESTONLY'), { document });
    expect(injected).toHaveLength(1);
    expect(injected[0]).toMatchObject({
      async: true,
      src: 'https://www.googletagmanager.com/gtm.js?id=GTM-TESTONLY',
    });
  });
});

/**
 * The ids are interpolated into that inline script, so the format check is
 * what stops a paste accident from rewriting the page. The mistake it is
 * really there for is the last case: the environment variable holding the
 * entire snippet Google hands you rather than the id out of it.
 */
describe('the id formats', () => {
  it('accepts the two shapes Google issues for a web tag', () => {
    expect(isMeasurementId('G-Q0FWM76FTF')).toBe(true);
    expect(isMeasurementId('GT-ABCD1234')).toBe(true);
    expect(isContainerId('GTM-ABC1234')).toBe(true);
  });

  it('does not accept one kind of id in the other kind of slot', () => {
    expect(isMeasurementId('GTM-ABC1234')).toBe(false);
    expect(isContainerId('G-Q0FWM76FTF')).toBe(false);
  });

  it('rejects anything that could close the script tag or add markup', () => {
    expect(isMeasurementId("G-X');alert(1);//")).toBe(false);
    expect(isMeasurementId('G-X</script><script>alert(1)</script>')).toBe(false);
    expect(isContainerId('GTM-X"><img onerror=alert(1)>')).toBe(false);
  });

  it('rejects a pasted snippet and an empty value', () => {
    expect(isMeasurementId('<script async src="https://www.googletagmanager.com/gtag/js?id=G-Q0FWM76FTF">')).toBe(false);
    expect(isMeasurementId('')).toBe(false);
    expect(isContainerId('')).toBe(false);
  });
});
