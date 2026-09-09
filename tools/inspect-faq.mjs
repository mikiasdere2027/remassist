import { readFileSync } from 'node:fs';
const s = readFileSync('c:/Users/LEGION/Documents/GitHub/REM Assistance Service Expansion/tools/append-faq-groups.mjs', 'utf8');
const lines = s.split(/\r?\n/);
for (let li = 16; li <= 19; li++) {
  const l = lines[li] ?? '';
  const bad = [];
  for (let i=0;i<l.length;i++) {
    const c = l.charCodeAt(i);
    if (c > 127) bad.push(`${i}:${c.toString(16)}:${JSON.stringify(l[i])}`);
  }
  console.log(`line ${li + 1}:`, bad.length ? bad.join(' ') : 'clean', '|', l.slice(0, 60));
}