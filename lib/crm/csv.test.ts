import { describe, expect, it } from 'vitest';
import { applyMapping, detectDelimiter, guessMapping, parseCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields', () => {
    const text = 'name,notes\r\n"Bekele, Amina","Said ""call me"" later\nthanks"\r\nJoan,ok\r\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'notes'],
      ['Bekele, Amina', 'Said "call me" later\nthanks'],
      ['Joan', 'ok'],
    ]);
  });
  it('strips a byte-order mark and blank lines', () => {
    expect(parseCsv('\uFEFFa,b\n\n1,2\n\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('detects semicolon and tab exports', () => {
    expect(detectDelimiter('Name;Email;Phone\nx;y;z')).toBe(';');
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(detectDelimiter('a\tb')).toBe('\t');
    expect(detectDelimiter('single')).toBe(',');
  });
});

describe('mapping', () => {
  it('guesses common headers and uses each field once', () => {
    expect(guessMapping(['Full Name', 'E-mail', 'Mobile', 'Company_Name', 'Email', 'Shoe size'])).toEqual([
      'fullName', 'email', 'phone', 'company', null, null,
    ]);
  });
  it('splits a full name when no first/last columns exist', () => {
    const rows = applyMapping([['Amina Bekele Tadesse', 'a@x.com', '']], ['fullName', 'email', 'phone']);
    expect(rows).toEqual([{ firstName: 'Amina', lastName: 'Bekele Tadesse', email: 'a@x.com' }]);
  });
  it('prefers explicit first/last over a full name', () => {
    const rows = applyMapping([['A B', 'Ann', 'Lee']], ['fullName', 'firstName', 'lastName']);
    expect(rows).toEqual([{ firstName: 'Ann', lastName: 'Lee' }]);
  });
});
