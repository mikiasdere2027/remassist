#!/usr/bin/env node
/*
 * codemod.js — port .dc.html artboards to Next.js App Router pages (§7.1).
 *
 * Per input file it:
 *   1. Extracts the page <helmet><style> block into a CSS Module
 *      (<route>.module.css) and strips the HTML wrapper/scripts/header/footer.
 *   2. Rewrites asset paths (assets/... → /images/...), drops the stamps.
 *   3. Transforms the remaining body markup into JSX: class→className,
 *      inline style→React object, self-closing voids, HTML entities, and
 *      the SVG attribute changes (stroke-width→strokeWidth, etc.).
 *   4. Writes <route>/page.tsx (a server component, no "use client") plus the
 *      CSS Module, with the page structure ready for hand-scripted content.
 *
 * It is intentionally *assistive*: output needs a human pass for metadata/OG.
 * Run from the repo root:
 *     node tools/codemod/codemod.js
 *
 * The codemod only *creates* files under app/, and never edits the legacy
 * .dc.html originals.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

const ROOT = path.resolve(__dirname, '..', '..');

/* Per-page source → output config */
/** Everything from this marker to the end of an existing page.module.css is
 *  hand-written and survives regeneration. */
const HAND_SENTINEL = '/* === hand-additions (preserved by codemod) === */';

const PAGES = [
  // Fully-static content pages (Phase 01 · Task 1)
  { src: 'Privacy Policy.dc.html', route: 'privacy-policy', title: 'Privacy Policy' },
  { src: 'Terms of Service.dc.html', route: 'terms-of-service', title: 'Terms of Service' },
  { src: 'FAQ.dc.html', route: 'faq', title: 'Frequently Asked Questions' },
  { src: 'Reviews.dc.html', route: 'reviews', title: 'Reviews' },
  { src: 'How it Works.dc.html', route: 'how-it-works', title: 'How It Works' },
  { src: 'Pricing.dc.html', route: 'pricing', title: 'Pricing' },
  { src: 'Blog.dc.html', route: 'blog', title: 'Blog & Guides' },
  { src: 'Case Studies.dc.html', route: 'case-studies', title: 'Case Studies' },
  /* Qualify.dc.html is deliberately absent. Its page is hand-composed: the
     artboard's own quiz markup is replaced by <QuizLogic />, the de-duplicated
     component /qualify and the home fit finder share (§8). Regenerating it
     would reintroduce a second copy of the quiz. Its sections 2-5 were ported
     across by hand and its CSS lives below the hand-additions sentinel. */
  // Service pages (Phase 01 · Task 2)
  { src: 'Customer Service Agents.dc.html', route: 'services/customer-service-agents', title: 'Customer Service Agents' },
  { src: 'GTM Teams.dc.html', route: 'services/gtm-teams', title: 'GTM Teams' },
  { src: 'SDR as a Service.dc.html', route: 'services/sdr-as-a-service', title: 'SDR as a Service' },
  { src: 'Virtual Back Office Team.dc.html', route: 'services/virtual-back-office-team', title: 'Virtual Back Office Team' },
  { src: 'Sales and Revenue.dc.html', route: 'services/sales-and-revenue', title: 'Sales & Revenue' },
  { src: 'Finance and Accounting.dc.html', route: 'services/finance-and-accounting', title: 'Finance & Accounting' },
  { src: 'AI and Automation.dc.html', route: 'services/ai-and-automation', title: 'AI & Automation' },
  { src: 'Managed IT.dc.html', route: 'services/managed-it', title: 'Managed IT' },
  { src: 'HR and Recruiting.dc.html', route: 'services/hr-and-recruiting', title: 'HR & Recruiting' },
  { src: 'Marketing and Content.dc.html', route: 'services/marketing-and-content', title: 'Marketing & Content' },
  { src: 'Industry Specific.dc.html', route: 'services/industry-specific', title: 'Industry Specific' },
  { src: 'Extra Services.dc.html', route: 'services/extra-services', title: 'Extra Services' },
];

/* Map a legacy .dc.html filename (or index.html) → its new app route.
   Used for cross-page href rewriting (fixed for the /services/* nested routes). */
const LINK_MAP = {
  'index.html': '/',
  'Home v1.dc.html': '/',
  'Privacy Policy.dc.html': '/privacy-policy',
  'Terms of Service.dc.html': '/terms-of-service',
  'FAQ.dc.html': '/faq',
  'Reviews.dc.html': '/reviews',
  'How it Works.dc.html': '/how-it-works',
  'Pricing.dc.html': '/pricing',
  'Blog.dc.html': '/blog',
  // The one written article; its body lives in app/blog/[slug]/ArticleBody.tsx
  // and lib/blog/posts.ts owns the slug. Phase 03 moves both into Postgres.
  'Blog Post.dc.html': '/blog/hiring-offshore-without-losing-quality-control',
  'Case Studies.dc.html': '/case-studies',
  'Qualify.dc.html': '/qualify',
  'Customer Service Agents.dc.html': '/services/customer-service-agents',
  'GTM Teams.dc.html': '/services/gtm-teams',
  'SDR as a Service.dc.html': '/services/sdr-as-a-service',
  'Virtual Back Office Team.dc.html': '/services/virtual-back-office-team',
  'Sales and Revenue.dc.html': '/services/sales-and-revenue',
  'Finance and Accounting.dc.html': '/services/finance-and-accounting',
  'AI and Automation.dc.html': '/services/ai-and-automation',
  'Managed IT.dc.html': '/services/managed-it',
  'HR and Recruiting.dc.html': '/services/hr-and-recruiting',
  'Marketing and Content.dc.html': '/services/marketing-and-content',
  'Industry Specific.dc.html': '/services/industry-specific',
  'Extra Services.dc.html': '/services/extra-services',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/* HTML/SVG attribute name → JSX camelCase. */
function attrToJsx(name) {
  if (/^data[-:]/.test(name)) return name.replace(/^data-/, 'data-');
  if (/^aria[-:]/.test(name)) return name.replace(/^aria-/, 'aria-');
  const map = {
    class: 'className', for: 'htmlFor',
    'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin', 'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray', 'stroke-dashoffset': 'strokeDashoffset',
    'fill-rule': 'fillRule', 'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity',
    'clip-rule': 'clipRule', 'clip-path': 'clipPath', 'viewbox': 'viewBox',
    'mask-type': 'maskType', 'text-anchor': 'textAnchor',
    'font-family': 'fontFamily', 'font-size': 'fontSize', 'font-weight': 'fontWeight',
    'font-style': 'fontStyle', 'font-variant': 'fontVariant',
    'letter-spacing': 'letterSpacing', 'word-spacing': 'wordSpacing',
    'text-length': 'textLength', 'xml:space': 'xmlSpace',
    'shape-rendering': 'shapeRendering', 'color-rendering': 'colorRendering',
    'image-rendering': 'imageRendering', 'tabindex': 'tabIndex',
    'readonly': 'readOnly', 'maxlength': 'maxLength', 'minlength': 'minLength',
    'colspan': 'colSpan', 'rowspan': 'rowSpan', 'contenteditable': 'contentEditable',
    'autocomplete': 'autoComplete', 'autofocus': 'autoFocus', 'autoplay': 'autoPlay',
    'allowfullscreen': 'allowFullScreen', 'frameborder': 'frameBorder',
    'allowtransparency': 'allowTransparency',
  };
  if (map[name]) return map[name];
  if (/-/.test(name)) return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return name;
}

/* CSS property name → React camelCase (custom props pass through). */
function cssPropName(prop) {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/* React numeric-ish value: strip px from 0, keep unit strings quoted. */
function cssValueToReact(value) {
  const cleaned = value.trim();
  if (cleaned === '0') return '0';
  const n = Number(cleaned);
  if (!Number.isNaN(n) && /^[-+]?[0-9.]+$/.test(cleaned)) return String(n);
  // Emit as a double-quoted JS string, escaping inner double quotes. url(...)
  // values commonly contain single quotes (data URIs) — single-quote them
  // safely by converting the whole value to a JS double-quoted string.
  const escaped = cleaned.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/* Parse an inline style attr into a JSX object literal (string). */
function styleAttrToJsx(raw) {
  const decls = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const parts = [];
  const seen = new Set();
  for (const d of decls) {
    const idx = d.indexOf(':');
    if (idx < 0) continue;
    const prop = d.slice(0, idx).trim();
    const value = d.slice(idx + 1).trim();
    if (!prop || !value) continue;
    const jsxProp = cssPropName(prop);
    if (seen.has(jsxProp)) continue; // first wins (matches most source)
    seen.add(jsxProp);
    parts.push(`${jsxProp}: ${cssValueToReact(value)}`);
  }
  return parts.join(', '); // inner object body (no surrounding braces)
}

/* ------------------------------------------------------------------ */
/* Asset path rewrite                                                   */
/* ------------------------------------------------------------------ */
/* In the legacy files, static assets are referenced as assets/images/...
   (which resolve relative to the repo root at serve time). In Next, public
   files are served at /images/... — so rewrite the leading path segment. */
function rewriteAssetPath(url, page) {
  if (page.assetOverrides && url in page.assetOverrides) return page.assetOverrides[url];
  // The artboards' assets/ tree was copied to public/images/, so the public
  // URL keeps the /images prefix. Dropping it (as this used to) produced
  // /teams/x.jpg and /Agents/x.jpg — every image on every ported page 404'd,
  // which went unnoticed while the pages were also rendering unstyled.
  if (url.startsWith('assets/images/')) return '/images/' + url.slice('assets/images/'.length);
  if (url.startsWith('assets/')) return '/images/' + url.slice('assets/'.length);
  if (url.startsWith('./support.js')) return null; // drop loader script
  if (url.startsWith('assets/ask-remassist.js')) return null; // drop widget (Phase 02)
  return url;
}

/* ------------------------------------------------------------------ */
/* Main extraction + JSX transform                                      */
/* ------------------------------------------------------------------ */

/** Extract the CSS text from the page's <helmet><style> block, minus the
    global reset preamble that duplicates globals.css. */
function extractStyle(src) {
  const m = src.match(/<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>[\s\S]*?<\/helmet>/);
  if (!m) throw new Error('no <style> block found in helmet');
  let css = m[1].trim();

  // Drop the shared preamble: html/body reset + global a / a:hover rules.
  // These already live in styles/globals.css and are invalid as CSS-module
  // selectors (no local class/id). Keep @keyframes and any page-specific
  // starts. We remove balanced { } groups whose top-level selector is one of
  // the global tags, but keep everything else.
  css = css.replace(/html,\s*body\s*\{[\s\S]*?\}/g, '');
  css = css.replace(/^\s*a\s*\{[\s\S]*?\}\s*$/gm, '');
  css = css.replace(/^\s*a:\s*hover\s*\{[\s\S]*?\}\s*$/gm, '');

  // A surviving bare element selector fails the CSS-module "pure selector"
  // check and breaks the build outright — and :global(html) does not satisfy
  // it either, since a pure selector needs a local class or id. The strips
  // above only catch the top-level reset; a document-level rule nested in a
  // media query (the blog post's `html { scroll-behavior: auto }` under
  // prefers-reduced-motion) gets through. Drop those and report them: they
  // belong in styles/globals.css, where they apply site-wide, not in one
  // page's module.
  const dropped = [];
  css = css.replace(/(^|[\s{};])(html|body|:root)(\s*\{[^}]*\})/g, (_all, pre, sel, rule) => {
    dropped.push((sel + rule).replace(/\s+/g, ' ').trim());
    return pre;
  });
  if (dropped.length) {
    console.warn(`  ! dropped ${dropped.length} document-level rule(s) — move to styles/globals.css if still wanted:`);
    for (const d of dropped) console.warn(`      ${d}`);
  }
  return css.trim();
}

/** Strip the HTML wrappers, scripts, header, footer → inner body markup. */
function extractBody(src) {
  let html = src;

  // Remove the <script src="./support.js"> + any other script tags.
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove the stamped header + footer blocks (markers + content).
  html = html.replace(/<!--\s*@shared:header[\s\S]*?\/@shared:header\s*-->/g, '');
  html = html.replace(/<!--\s*@shared:footer[\s\S]*?\/@shared:footer\s*-->/g, '');
  html = html.replace(/<!--\s*@shared:[\s\S]*?\/@shared:[\s\S]*?-->/gi, '');

  // Extract everything after the trailer </head> to the final <main>...</main>.
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/);
  if (!mainMatch) throw new Error('no <main> block found');
  return mainMatch[0].trim();
}

/** Convert a raw HTML attribute value to a JSX attribute/expression (string). */
function attrValueToJsx(value) {
  if (value.startsWith('{') && value.endsWith('}')) return value; // already expr
  // Keep numeric-strings where React wants a number (width="24").
  if (/^-?[0-9.]+$/.test(value)) return `'${value}'`; // quoted string to be safe
  return `'${value}'`;
}

/* Convert className template literals containing spaces into a string. */
function classNameToJsx(cls) {
  // Multiple classes — join via template literal.
  return `styles['${cls.split(/\s+/).filter(Boolean).join("' /* ' + styles['")}']`;
}

/* __PART2__ */

/* Parse a string of raw attributes into a {name: value} map. */
function parseAttrs(raw) {
  const map = {};
  const re = /([\w:-]+)(="([^"]*)"|='([^']*)')?/g;
  let m;
  while ((m = re.exec(raw))) {
    map[m[1]] = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : '');
  }
  return map;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
  // SVG self-closing shapes → treat as void so they emit />, not children.
  'circle', 'line', 'path', 'rect', 'polyline', 'polygon', 'ellipse',
  'use', 'stop', 'feGaussianBlur', 'linearGradient', 'radialGradient',
  'clipPath', 'mask', 'symbol',
]);

/* Attribute names React treats as booleans — a present empty value means true. */
const BOOLEAN_ATTRS = new Set([
  'async', 'autofocus', 'autoPlay', 'checked', 'controls', 'default',
  'defer', 'disabled', 'formnovalidate', 'hidden', 'inert', 'ismap',
  'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate',
  'open', 'playsinline', 'readonly', 'required', 'reversed', 'scoped',
  'seamless', 'selected',
]);

function isVoid(tag) {
  return VOID_TAGS.has(String(tag).toLowerCase());
}

/* Build per-file context: holds the hover-rule accumulator. */
function makeContext(page) {
  return {
    page,
    hoverCounter: 0,
    hoverRules: [],
    // Set of class names defined in the extracted page CSS (for className mapping).
    knownClasses: new Set(),
    addHoverRule(decl) {
      const n = ++this.hoverCounter;
      this.hoverRules.push(`.hv-${n}{${decl}}`);
      return `hv-${n}`;
    },
    isKnownClass(c) {
      return this.knownClasses.has(c);
    },
  };
}

/* JSX className expression from a space-separated class list.
   Classes defined in the page's CSS module → styles['x']; anything else
   (framework/hover-injected classes) stays a plain string so we never emit
   styles['undefined']. */
function jsxClassesExpr(classList, ctx) {
  const classes = classList.split(/\s+/).filter(Boolean);
  if (classes.length === 0) return null;
  // hv-N classes are always defined by the module (hover rules we inject);
  // other classes resolve through styles[] only when the page CSS defines them.
  const parts = classes.map((c) =>
    /^hv-\d+$/.test(c) || ctx.isKnownClass(c) ? `styles['${c}']` : `'${c}'`
  );
  return '{' + parts.join(" + ' ' + ") + '}';
}

/* Serialize an element + children to JSX (recursive). */
function nodeToJsx(node, ctx) {
  // Text: decode entities for correct characters, then re-escape < and > so
  // raw comparison operators like "<60s" don't parse as JSX tags.
  if (node.nodeType === 3) {
    const t = replaceMustache(decodeEntities(node.rawText))
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return t;
  }
  if (node.nodeType === 8) return ''; // drop comments

  const tagName = String(node.tagName).toLowerCase();
  // Replace the DC runtime <x-import component-from-global-scope="image-slot">
  // with a styled static placeholder box (the runtime is deleted in §7.4).
  if (tagName === 'x-import' || tagName === 'x-import-component') {
    const attrMap2 = parseAttrs(node.rawAttrs || '');
    const placeholder = attrMap2.placeholder || 'Image';
    const styleAttr = attrMap2.style || 'width:100%;height:100%;';
    return `<div style={{ ${styleAttrToJsx(styleAttr)}, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-marketing-paper)', border: '1px dashed var(--border-strong)', borderRadius: '8px', color: 'var(--ink-400)', fontSize: '13px', boxSizing: 'border-box' }}>${decodeEntities(placeholder)}</div>`;
  }
  const attrMap = parseAttrs(node.rawAttrs || '');
  const parts = [];

  // style-hover → emit a module rule + class. The source uses `class`;
  // append the hover class to that same key so it becomes a single merged
  // className in the output (never two className attributes).
  if (attrMap['style-hover']) {
    const cls = ctx.addHoverRule(attrMap['style-hover']);
    attrMap.class = ((attrMap.class || '') + ' ' + cls).trim();
    delete attrMap['style-hover'];
  }

  // Rewrite asset hrefs/srcs.
  if (attrMap.src) attrMap.src = rewriteAssetPath(attrMap.src, ctx.page);
  if (attrMap.href && !/^(https?:|\/|#|mailto:|tel:)/.test(attrMap.href)) {
    // Legacy .dc.html / index.html href → new route via LINK_MAP.
    const merged = (attrMap.href.split('#')[0]).trim();
    const rest = attrMap.href.slice(merged.length); // preserve #anchor if any
    if (merged.endsWith('.dc.html') || merged === 'index.html') {
      const target = LINK_MAP[merged];
      if (target) attrMap.href = target + rest;
      else attrMap.href = rewriteAssetPath(merged, ctx.page) + rest;
    } else {
      attrMap.href = rewriteAssetPath(merged, ctx.page) + rest;
    }
  } else if (attrMap.href && /^\/\//.test(attrMap.href)) {
    // protocol-relative URLs → https:
    attrMap.href = 'https:' + attrMap.href;
  }

  for (const [name, value] of Object.entries(attrMap)) {
    if (value == null) continue;
    if (name === 'style') {
      parts.push(` style={{ ${styleAttrToJsx(value)} }}`);
    } else if (name === 'class') {
      // NB: the key here comes from parseAttrs on the raw HTML, so it is
      // `class` — the rename to `className` happens in attrToJsx below. This
      // branch used to test for 'className', which never matched, so every
      // class fell through to the generic string branch and shipped as a
      // literal `className='pr-wrap'` that no hashed module selector could
      // ever match. That is what left 20 routes rendering unstyled.
      const expr = jsxClassesExpr(value, ctx);
      if (expr) parts.push(` className=${expr}`);
    } else if (/^on/i.test(name)) {
      // Skip inline event-handler strings (onsubmit="return false;", etc.)
      // — interactive behavior is Phase 02, not the static port.
      continue;
    } else {
      const jsxName = attrToJsx(name);
      // Boolean attributes: emit as a bare prop (React wants boolean/undefined,
      // not a quoted string). Present-with-empty-value means true.
      const val = decodeEntities(String(value));
      if (BOOLEAN_ATTRS.has(name) && (value === '' || value === 'true')) {
        parts.push(` ${jsxName}={true}`);
        continue;
      }
      // Always quote attribute values as strings — bare numbers (cx=11,
      // strokeWidth=1.8) are invalid JSX. React coerces numeric strings for
      // width/height/etc.
      const v = `'${val.replace(/'/g, "\\'")}'`;
      parts.push(` ${jsxName}=${v}`);
    }
  }

  if (isVoid(tagName)) {
    return `<${tagName}${parts.join('')} />`;
  }

  const children = node.childNodes.map((c) => nodeToJsx(c, ctx)).join('');
  return `<${tagName}${parts.join('')}>${children}</${tagName}>`;
}

/* Replace DC mustache template variables ({{ ctaLabel }}) with their static
   component defaults. Only ctaLabel is in use across the artboards. */
function replaceMustache(str) {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
    if (name === 'ctaLabel') return 'Book a Call';
    // Unknown variable: keep the placeholder so it's visible for a human pass.
    return `{{ ${name} }}`;
  });
}

/* Decode common HTML entities safely for JSX text/attributes. */
function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&#160;/g, '\u00a0')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, '\u00a9')
    .replace(/&reg;/g, '\u00ae')
    .replace(/&trade;/g, '\u2122')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&sect;/g, '\u00a7')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&larr;/g, '\u2190')
    .replace(/&rArr;/g, '\u21d2')
    .replace(/&rsaquo;/g, '\u203a')
    .replace(/&lsaquo;/g, '\u2039')
    .replace(/&bull;/g, '\u2022')
    .replace(/&frac12;/g, '\u00bd')
    .replace(/&frac14;/g, '\u00bc');
}

/* __PART3__ */

/* Extract all class names referenced in the page CSS → knownClasses set.
   Includes the injected .hv-N hover rules so they map through styles['hv-N']. */
function collectKnownClasses(css, ctx) {
  const clsRe = /\.([_a-zA-Z][\w-]*)/g;
  let m;
  while ((m = clsRe.exec(css))) {
    ctx.knownClasses.add(m[1]);
  }
}

/* Assemble a JSX page.tsx (server component) + a CSS module from a source page. */
function convertPage(page) {
  const abs = path.join(ROOT, page.src);
  const src = fs.readFileSync(abs, 'utf8');

  // 1. Extract CSS + body.
  let styleCss;
  let bodyHtml;
  try {
    styleCss = extractStyle(src);
    bodyHtml = extractBody(src);
  } catch (e) {
    console.error(`  ✗ ${page.src}: ${e.message}`);
    return null;
  }

  // 2. Parse the body into a DOM and render JSX.
  const doc = parse(bodyHtml, { comment: false });
  const ctx = makeContext(page);
  collectKnownClasses(styleCss, ctx);
  const mainEl = doc.querySelector('main') || doc;
  // Strip the loader-script remnant if the <main> still has one.
  const jsxBody = mainEl.childNodes.map((c) => nodeToJsx(c, ctx)).join('\n');

  // 3. Emit the CSS module (style rules + hover rules).
  const hoverCss = ctx.hoverRules.length ? '\n' + ctx.hoverRules.join('\n') : '';
  // Anything below the sentinel in an existing module is hand-written and is
  // carried across. Without this, a rule added after the port (e.g. the blog's
  // unlinked-card overrides) silently disappears the next time this runs.
  const existingCssPath = path.join(ROOT, 'app', page.route, 'page.module.css');
  let kept = '';
  if (fs.existsSync(existingCssPath)) {
    const prev = fs.readFileSync(existingCssPath, 'utf8');
    const at = prev.indexOf(HAND_SENTINEL);
    if (at !== -1) kept = '\n' + prev.slice(at).trimEnd() + '\n';
  }
  const css = `/* Auto-generated from ${page.src} by tools/codemod/codemod.js (Phase 01 §7.1). Do not hand-edit above the hand-additions sentinel. */\n${styleCss}${hoverCss}\n${kept}`;

  // 4. (Internal href rewriting is handled in nodeToJsx via LINK_MAP.)
  const jsxLinks = jsxBody;

  const outDir = path.join(ROOT, 'app', page.route);

  // 5. Write files.
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'page.module.css'), css);

  const pageFile = path.join(outDir, 'page.tsx');
  if (!fs.existsSync(pageFile) || process.argv.includes('--force')) {
    const tsx = `import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '${page.title}',
  description: '',
};

export default function Page() {
  return (
    <main>
${indent(jsxBody, 2)}
    </main>
  );
}
`;
    fs.writeFileSync(pageFile, tsx);
  } else {
    console.log(`  → ${page.route}/page.tsx: exists, skipped (preserving hand-edits)`);
  }

  console.log(`  ✓ ${page.src} → app/${page.route}/page.tsx (${bodyHtml.length} body chars)`);
  return { route: page.route, css };
}

/* Indent every line of a block by `n` spaces. */
function indent(str, n) {
  const pad = ' '.repeat(n);
  return str
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */
function main() {
  console.log('Rem Assist .dc.html → JSX codemod (Phase 01 §7.1)\n');
  let ok = 0;
  for (const page of PAGES) {
    const res = convertPage(page);
    if (res) ok++;
  }
  console.log(`\nDone. Converted ${ok}/${PAGES.length} page(s).`);
  if (ok < PAGES.length) process.exit(1);
}

main();