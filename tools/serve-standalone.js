#!/usr/bin/env node
/*
 * serve-standalone.js — run the actual deployment artifact locally.
 *
 * next.config.ts sets `output: 'standalone'`, and `next start` does not support
 * that: it boots, serves some routes and 500s on others, which reads exactly
 * like an application bug and is not one. Next itself warns
 * "next start does not work with output: standalone" and points at
 * .next/standalone/server.js.
 *
 * That server is what systemd runs on the VPS (§12), so this is the only local
 * server that proves what will actually be deployed. It needs
 * `node tools/package-standalone.js` to have run first — standalone does not
 * copy public/ or .next/static, and without them every asset 404s.
 *
 *   npm run build
 *   node tools/package-standalone.js
 *   node tools/serve-standalone.js [port]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '.next', 'standalone');
const entry = path.join(root, 'server.js');

if (!fs.existsSync(entry)) {
  console.error('No standalone build found. Run `npm run build` first.');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'public'))) {
  console.error('standalone/public is missing — run `node tools/package-standalone.js` first,');
  console.error('or every image and font will 404.');
  process.exit(1);
}

process.env.PORT = process.argv[2] || process.env.PORT || '3400';
process.env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';

// server.js resolves its paths relative to its own directory, so run it there.
process.chdir(root);
require(entry);
