import { describe, expect, it } from 'vitest';
import { describeDevice } from './devices';

const UA = {
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edgeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  operaLinux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0',
};

describe('describeDevice', () => {
  it('names the browser and the system', () => {
    expect(describeDevice(UA.firefoxLinux)).toBe('Firefox on Linux');
    expect(describeDevice(UA.chromeWindows)).toBe('Chrome on Windows');
    expect(describeDevice(UA.safariMac)).toBe('Safari on macOS');
    expect(describeDevice(UA.safariIphone)).toBe('Safari on iOS');
    expect(describeDevice(UA.chromeAndroid)).toBe('Chrome on Android');
  });
  it('tells Edge and Opera apart from the Chrome they are built on', () => {
    expect(describeDevice(UA.edgeWindows)).toBe('Edge on Windows');
    expect(describeDevice(UA.operaLinux)).toBe('Opera on Linux');
  });
  it('copes with missing or odd values', () => {
    expect(describeDevice(null)).toBe('Unknown device');
    expect(describeDevice('')).toBe('Unknown device');
    expect(describeDevice('curl/8.5.0')).toBe('Unknown browser');
    expect(describeDevice('SomeBot/1.0 (Linux)')).toBe('Unknown browser on Linux');
  });
});
