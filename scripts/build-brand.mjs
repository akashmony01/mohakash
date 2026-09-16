// Generate the served brand assets in public/ from the masters in brand/.
// Run after replacing a master:  npm run build:brand
//
// brand/logo.pdf is the original vector artwork (Canva, 3 pages: wordmark on
// light, icon, wordmark on blue). brand/wordmark.svg and brand/icon.svg are
// pages 1 and 2 extracted with:
//   pdftocairo -svg -f 1 -l 1 brand/logo.pdf brand/wordmark.svg
//   pdftocairo -svg -f 2 -l 2 brand/logo.pdf brand/icon.svg
// They're committed so this script needs no poppler at build time.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => fileURLToPath(new URL(rel, root));

// ---------------------------------------------------------------------------
// Wordmark
//
// The artwork has exactly three colour groups, and pdftocairo keeps each on a
// distinct fill, so we can repaint them independently:
//   letters  — seven <g fill> glyph groups
//   planet   — two <path fill>, the disc and the needle through it
//   cut      — one white <path>, the slash that separates needle from disc
// The cut has to match whatever the mark sits on, so it reads as a gap rather
// than a stray line. That, plus contrast, is why each backdrop gets its own
// file instead of one shared asset.
const SRC_LETTERS = 'rgb(0%, 0%, 0%)';
const SRC_PLANET = 'rgb(21.958923%, 71.369934%, 100%)';
const SRC_CUT = 'rgb(100%, 100%, 100%)';

// Site palette (src/styles/global.css) — the mark's own #38B6FF is deliberately
// not used, so the logo doesn't sit a shade off from everything around it.
const ACCENT = '#1a8fd6';       // --color-accent
const TEXT = '#0e1116';         // --color-text  (light)
const TEXT_DARK = '#e8eaf2';    // --color-text  (dark)
const SURFACE = '#ffffff';      // --color-surface (light)
const SURFACE_DARK = '#151a2a'; // --color-surface (dark)

async function loadWordmark() {
  let svg = await readFile(p('brand/wordmark.svg'), 'utf8');
  // Drop the full-bleed page background so the mark sits on transparency.
  svg = svg.replace(/<rect\s+x="-150"[^>]*\/>/g, '');
  return svg;
}

// Ink bounds in user units, so each variant can be cropped to the artwork
// instead of inheriting the 1500x1500 page it was designed on.
async function inkBox(svg) {
  const SCALE = 1000 / 1500;
  const { data, info } = await sharp(Buffer.from(svg), { density: 72 * SCALE })
    .resize(1000, 1000, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const u = 1500 / 1000; // px -> user units
  const pad = 2 * u;     // a hair of margin so nothing clips at the edge
  return {
    x: Math.max(0, x0 * u - pad),
    y: Math.max(0, y0 * u - pad),
    w: (x1 - x0 + 1) * u + pad * 2,
    h: (y1 - y0 + 1) * u + pad * 2,
  };
}

function paint(svg, { letters, planet, cut }) {
  return svg
    .split(SRC_LETTERS).join(letters)
    .split(SRC_PLANET).join(planet)
    .split(SRC_CUT).join(cut);
}

function reframe(svg, box) {
  const vb = `${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`;
  return svg.replace(
    /<svg([^>]*?)>/,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${box.w.toFixed(2)}" height="${box.h.toFixed(2)}" viewBox="${vb}">`,
  );
}

const wordmarkSrc = await loadWordmark();
const box = await inkBox(wordmarkSrc);
console.log(`Wordmark ink box: ${box.w.toFixed(1)} x ${box.h.toFixed(1)} (aspect ${(box.w / box.h).toFixed(4)})`);

const VARIANTS = [
  // Header: solid accent bar, both themes.
  ['public/logo.svg', { letters: SURFACE, planet: TEXT, cut: ACCENT }],
  // Footer: --color-surface, which flips with the theme.
  ['public/logo-on-light.svg', { letters: TEXT, planet: ACCENT, cut: SURFACE }],
  ['public/logo-on-dark.svg', { letters: TEXT_DARK, planet: ACCENT, cut: SURFACE_DARK }],
];

for (const [out, tones] of VARIANTS) {
  const svg = reframe(paint(wordmarkSrc, tones), box);
  await writeFile(p(out), svg);
  console.log('Wrote', out, svg.length, 'bytes');
}

// ---------------------------------------------------------------------------
// Icon / favicons
//
// Same three groups as the wordmark. The slash has to be a real hole here,
// because a favicon sits on browser chrome we don't control — a white slash
// would be invisible on a light tab strip and a stray white line on a dark one.
// Rather than restructure the vector into an SVG mask, we render twice: once
// with the slash filled so we get the solid silhouette, once with only the
// slash, then subtract the second coverage from the first. That's exact, and
// the antialiasing along the cut subtracts correctly.
const ICON_BG = '#f7f7f3'; // --color-bg, for the icons that must be opaque

async function iconRgba(size) {
  let base = await readFile(p('brand/icon.svg'), 'utf8');
  base = base.replace(/<rect\s+x="-150"[^>]*\/>/g, '');

  const solid = base.split(SRC_PLANET).join(ACCENT).split(SRC_CUT).join(ACCENT);
  const cutOnly = base.split(SRC_PLANET).join('none').split(SRC_CUT).join(ACCENT);

  const render = async (svg) => {
    const { data, info } = await sharp(Buffer.from(svg), { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, info };
  };

  const a = await render(solid);
  const c = await render(cutOnly);

  const [r, g, b] = [26, 143, 214]; // ACCENT
  const out = Buffer.alloc(a.data.length);
  for (let i = 0; i < a.data.length; i += 4) {
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
    out[i + 3] = Math.max(0, a.data[i + 3] - c.data[i + 3]);
  }
  return sharp(out, { raw: { width: a.info.width, height: a.info.height, channels: 4 } });
}

// Trim to the artwork, then re-square with a small margin.
async function squaredIcon(size) {
  const trimmed = await (await iconRgba(1024)).trim({ threshold: 1 }).png().toBuffer();
  const t = await sharp(trimmed).metadata();
  const side = Math.max(t.width, t.height);
  const pad = Math.round(side * 0.06);
  const canvas = side + pad * 2;
  // Composite and resize have to be separate passes: sharp applies resize to
  // the base image before compositing, which would shrink the canvas below the
  // overlay and fail.
  const squared = await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left: Math.round((canvas - t.width) / 2), top: Math.round((canvas - t.height) / 2) }])
    .png()
    .toBuffer();
  return sharp(squared).resize(size, size).png().toBuffer();
}

// Transparent icons — browser tabs and PWA "any" icons.
for (const [out, size] of [
  ['public/favicon.png', 256],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]) {
  const png = await squaredIcon(size);
  await writeFile(p(out), png);
  console.log('Wrote', out, `${size}x${size}`, png.length, 'bytes');
}

// Opaque icons. iOS composites a transparent apple-touch-icon onto black, and
// Android crops a maskable icon to an arbitrary shape, so both need a filled
// background and the mark kept inside the centre safe zone.
for (const [out, size, inset] of [
  ['public/apple-touch-icon.png', 180, 0.78],
  ['public/icon-maskable-512.png', 512, 0.6],
]) {
  const inner = Math.round(size * inset);
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: ICON_BG } })
    .composite([{ input: await squaredIcon(inner), left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png()
    .toBuffer();
  await writeFile(p(out), png);
  console.log('Wrote', out, `${size}x${size}`, png.length, 'bytes');
}
