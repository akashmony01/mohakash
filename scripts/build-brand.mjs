// Generate the served brand assets in public/ from the masters in brand/.
// Run after replacing brand/logo.png or brand/favicon.png:
//   node scripts/build-brand.mjs
//
// The wordmark is a two-tone PNG on transparency: white letters + a dark
// (#151a2a) planet glyph. That single file only reads well on the blue header
// — on the footer the white letters vanish in light mode and the planet (which
// is exactly the dark-mode surface token) vanishes in dark mode. So we emit
// recolored variants: each pixel's luminance says how far it sits between the
// two source tones, and we remap that blend onto a new pair. Doing it as a
// blend rather than a threshold keeps the antialiased edges smooth.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => fileURLToPath(new URL(rel, root));

const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The two tones present in the master wordmark.
const SRC_PLANET = [21, 26, 42];
const SRC_LETTER = [255, 255, 255];

async function recolor(srcPath, outPath, planet, letter) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lo = luma(SRC_PLANET);
  const hi = luma(SRC_LETTER);
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const t = Math.min(1, Math.max(0, (luma([data[i], data[i + 1], data[i + 2]]) - lo) / (hi - lo)));
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(planet[c] + t * (letter[c] - planet[c]));
    out[i + 3] = data[i + 3]; // alpha carries the glyph shape — leave it alone
  }

  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  await writeFile(p(outPath), png);
  console.log('Wrote', outPath, png.length, 'bytes');
}

const ACCENT = [26, 143, 214];  // --color-accent  #1a8fd6
const TEXT = [14, 17, 22];      // --color-text    #0e1116 (light mode)
const WHITE = [255, 255, 255];

// Header sits on solid accent blue — the master already reads correctly there.
const logoMaster = await readFile(p('brand/logo.png'));
await writeFile(p('public/logo.png'), logoMaster);
console.log('Wrote public/logo.png', logoMaster.length, 'bytes');

// Footer sits on --color-surface, which flips with the theme.
await recolor(p('brand/logo.png'), 'public/logo-on-light.png', ACCENT, TEXT);
await recolor(p('brand/logo.png'), 'public/logo-on-dark.png', ACCENT, WHITE);

// Favicons / PWA icons, all from the square master. The master is a flat RGB
// image (blue planet on solid white), which shows as a white tile on dark
// browser chrome, so we key the white out to alpha and trim the empty margin
// to let the mark fill the icon. The diagonal slash is white too, and becomes a
// transparent cut through the disc — which is the intended reading.
async function markOnAlpha(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const keyed = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // Distance from pure white drives alpha, so antialiased edges stay smooth.
    const a = Math.min(255, 255 - mn + (mx - mn));
    keyed[i] = r; keyed[i + 1] = g; keyed[i + 2] = b;
    keyed[i + 3] = a > 250 ? 255 : a;
  }
  const cut = await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(cut).trim({ threshold: 1 }).png().toBuffer();
  const t = await sharp(trimmed).metadata();
  // Re-square with a small margin so no size lands on a cropped edge.
  const side = Math.max(t.width, t.height);
  const pad = Math.round(side * 0.06);
  const canvas = side + pad * 2;
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left: Math.round((canvas - t.width) / 2), top: Math.round((canvas - t.height) / 2) }])
    .png()
    .toBuffer();
}

const mark = await markOnAlpha(p('brand/favicon.png'));

const ICONS = [
  ['public/favicon.png', 256],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
];
for (const [out, size] of ICONS) {
  const png = await sharp(mark).resize(size, size).png().toBuffer();
  await writeFile(p(out), png);
  console.log('Wrote', out, `${size}x${size}`, png.length, 'bytes');
}

// Maskable icon: Android crops this to an arbitrary shape (circle, squircle,
// …), so it needs an opaque fill and the mark kept inside the centre ~80% safe
// zone. The transparent icons above would let the launcher background show
// through and lose the slash, so this one gets its own file.
{
  const size = 512;
  const inner = Math.round(size * 0.6);
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: '#f7f7f3' },
  })
    .composite([{ input: await sharp(mark).resize(inner, inner).png().toBuffer(), left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png()
    .toBuffer();
  await writeFile(p('public/icon-maskable-512.png'), png);
  console.log('Wrote public/icon-maskable-512.png 512x512', png.length, 'bytes');
}
