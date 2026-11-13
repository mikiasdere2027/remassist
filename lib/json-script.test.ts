import { describe, expect, it } from 'vitest';
import { safeJsonForScript } from './json-script';

describe('safeJsonForScript', () => {
  it('cannot close the script tag it is written into', () => {
    const out = safeJsonForScript({ headline: '</script><script>alert(1)</script>' });
    expect(out).not.toMatch(/<|>/);
  });

  it('round-trips to the same data', () => {
    const data = { a: '<b> & </c>', b: 'line sep ', n: 1 };
    expect(JSON.parse(safeJsonForScript(data))).toEqual(data);
  });
});
