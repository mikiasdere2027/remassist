import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { MAX_FILE_BYTES, checkFile, formatBytes, resolveKey, safeName, sniffType } from './files';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('private files', () => {
  it('trusts the bytes, not the name or the browser', () => {
    expect(sniffType(PDF, 'image/png')).toBe('application/pdf');
    expect(sniffType(ZIP, DOCX)).toBe(DOCX);
    expect(sniffType(ZIP, 'application/zip')).toBeNull();
    expect(sniffType(EXE, 'application/pdf')).toBeNull();
  });
  it('accepts a contract and rejects the rest with a reason', () => {
    expect(checkFile('Northwind MSA.pdf', 2000, PDF, 'application/pdf')).toEqual({ ok: true, mime: 'application/pdf', ext: 'pdf', name: 'Northwind MSA.pdf' });
    expect(checkFile('evil.pdf', 2000, EXE, 'application/pdf')).toEqual({ ok: false, error: 'Upload a PDF, Word, Excel, PNG or JPEG file.' });
    expect(checkFile('big.pdf', MAX_FILE_BYTES + 1, PDF, 'application/pdf')).toEqual({ ok: false, error: 'Files can be up to 5 MB.' });
    expect(checkFile('empty.pdf', 0, PDF, 'application/pdf')).toEqual({ ok: false, error: 'That file is empty.' });
  });
  it('cleans display names and forces the real extension', () => {
    expect(safeName('C:\\Users\\me\\Contract "v2".exe', 'pdf')).toBe('Contract v2.pdf');
    expect(safeName('../../etc/passwd', 'pdf')).toBe('passwd.pdf');
    expect(safeName('', 'png')).toBe('file.png');
  });
  it('never resolves a key outside the private folder', () => {
    process.env.PRIVATE_FILE_DIR = path.resolve('tmp-private');
    expect(resolveKey('ws/a.pdf')).toBe(path.join(path.resolve('tmp-private'), 'ws', 'a.pdf'));
    expect(() => resolveKey('../secrets.pdf')).toThrow('invalid file key');
    expect(() => resolveKey('/etc/passwd')).toThrow('invalid file key');
    delete process.env.PRIVATE_FILE_DIR;
  });
  it('formats sizes', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});
