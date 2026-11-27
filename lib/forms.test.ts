import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * A form without method="post" is sent as GET, with every field in the URL, if
 * it is submitted before the page's JavaScript has loaded. For a password (or a
 * reset email) that means browser history, proxy logs and Referer headers.
 */
describe('forms that take a password or an email for sign-in', () => {
  const files = walk(join(process.cwd(), 'app/admin')).filter((f) => {
    const src = readFileSync(f, 'utf8');
    return /<form\b/.test(src) && (/type="password"|type=\{[^}]*'password'|<PasswordFields/.test(src) || f.endsWith('ForgotForm.tsx'));
  });

  it('finds the forms it is meant to guard', () => {
    const names = files.map((f) => f.replace(process.cwd() + '/', ''));
    for (const must of ['SignInForm', 'ForgotForm', 'ResetForm', 'AcceptForm', 'ChangePasswordForm']) {
      expect(names.some((n) => n.includes(must)), must).toBe(true);
    }
  });

  it.each(files.map((f) => [f.replace(process.cwd() + '/', ''), f]))('%s posts, never gets', (_name, file) => {
    const src = readFileSync(file, 'utf8');
    const forms = [...src.matchAll(/<form\b[^>]*>/g)].map((m) => m[0]);
    expect(forms.length).toBeGreaterThan(0);
    for (const f of forms) expect(f).toMatch(/method="post"/);
  });
});
