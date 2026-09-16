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
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// The two tones present in the master wordmark.
const SRC_PLANET = [21, 26, 42];
const SRC_LETTER = [255, 255, 255];

// The master was cut out of its original background with a ~3px feather, which
// left two defects: a soft alpha ramp several pixels wide, and a pale-blue
// halo bled into the edge pixels' RGB. Together they read as blur and mute the
// white. cleanWordmark() undoes both, returning a clean coverage mask plus a
// continuous tone map (0 = planet, 1 = letter) that the variants colour in.
const SUPER = 4;      // supersample factor used to harden the alpha edge
const STEEPEN = 6;    // contrast applied to the alpha ramp at supersampled size
const OUT_SCALE = 2;  // emit at 2x so the mark stays crisp on HiDPI screens

async function cleanWordmark(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;

  const alpha = Buffer.alloc(N);
  const tone = new Float32Array(N);
  const core = new Uint8Array(N);
  const lo = luma(SRC_PLANET);
  const hi = luma(SRC_LETTER);

  for (let i = 0, p = 0; p < N; i += 4, p++) {
    alpha[p] = data[i + 3];
    // Only well-inside pixels are trusted for colour; the rest are feather.
    core[p] = data[i + 3] >= 200 ? 1 : 0;
    tone[p] = clamp01((luma([data[i], data[i + 1], data[i + 2]]) - lo) / (hi - lo));
  }

  // Repaint the untrusted edge pixels from the nearest trusted ones, so the
  // blue halo is replaced by whichever tone the edge actually belongs to.
  // Core pixels keep their measured tone, which preserves the antialiasing
  // along the slash where it cuts across the planet.
  const R = 4;
  const toneFixed = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (core[p]) { toneFixed[p] = tone[p]; continue; }
      let num = 0, den = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const q = yy * W + xx;
          if (!core[q]) continue;
          const w = 1 / (1 + dx * dx + dy * dy);
          num += tone[q] * w;
          den += w;
        }
      }
      toneFixed[p] = den > 0 ? num / den : 1;
    }
  }

  const OW = W * OUT_SCALE, OH = H * OUT_SCALE;

  // Harden the alpha: blow it up, push the soft ramp toward a step, then
  // resample down. Doing the steepening supersampled is what leaves a clean
  // one-pixel antialiased edge instead of a jagged one. Mitchell on the way
  // down — lanczos rings on hard edges and would reintroduce a halo.
  const up = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
    .resize(W * SUPER, H * SUPER, { kernel: 'cubic' })
    // sharp promotes a raw 1-channel input to 3-channel sRGB on resize; pin it
    // back to greyscale so the buffer stays one byte per pixel.
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  for (let i = 0; i < up.length; i++) {
    up[i] = Math.max(0, Math.min(255, Math.round((up[i] - 128) * STEEPEN + 128)));
  }
  const alphaOut = await sharp(up, { raw: { width: W * SUPER, height: H * SUPER, channels: 1 } })
    .resize(OW, OH, { kernel: 'mitchell' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const toneBytes = Buffer.alloc(N);
  for (let p = 0; p < N; p++) toneBytes[p] = Math.round(clamp01(toneFixed[p]) * 255);
  const toneOut = await sharp(toneBytes, { raw: { width: W, height: H, channels: 1 } })
    .resize(OW, OH, { kernel: 'mitchell' })
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  return { width: OW, height: OH, alpha: alphaOut, tone: toneOut };
}

// Paint a cleaned wordmark in a given pair of tones.
async function writeVariant(mark, outPath, planet, letter) {
  const { width, height, alpha, tone } = mark;
  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const t = tone[p] / 255;
    for (let c = 0; c < 3; c++) rgba[p * 4 + c] = Math.round(planet[c] + t * (letter[c] - planet[c]));
    rgba[p * 4 + 3] = alpha[p];
  }
  const png = await sharp(rgba, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(p(outPath), png);
  console.log('Wrote', outPath, `${width}x${height}`, png.length, 'bytes');
}

const ACCENT = [26, 143, 214];  // --color-accent  #1a8fd6
const TEXT = [14, 17, 22];      // --color-text    #0e1116 (light mode)
const NAVY = SRC_PLANET;        // the mark's own dark tone
const WHITE = [255, 255, 255];

const wordmark = await cleanWordmark(p('brand/logo.png'));

// Header sits on solid accent blue, so it keeps the mark's own two tones.
await writeVariant(wordmark, 'public/logo.png', NAVY, WHITE);
// Footer sits on --color-surface, which flips with the theme.
await writeVariant(wordmark, 'public/logo-on-light.png', ACCENT, TEXT);
await writeVariant(wordmark, 'public/logo-on-dark.png', ACCENT, WHITE);

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
