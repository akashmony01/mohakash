// Build the social preview card: public/og.svg + public/og.png (1200x630).
//   npm run build:og
//
// og.svg is written FULLY SELF-CONTAINED — the type is outlines, the logo is
// nested vector, and the portrait is an embedded data URI. An earlier version
// referenced the portrait relatively, which kept the file smaller but only
// rendered in tools that fetch external files; most SVG viewers showed an empty
// box. Everything is inlined now, so the file renders identically anywhere.
//
// Run `npm run build:brand` first if the logo changed, and
// scripts/build-og-text.py if the card's wording changed.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => fileURLToPath(new URL(rel, root));

const W = 1200, H = 630;
const M = 84;                                  // left margin, mirrored right
const PX = 752, PY = 74, PW = 364, PH = 482, PR = 26;  // portrait card
const LOGO_W = 296, LOGO_X = M, LOGO_Y = 74;

// Site palette (src/styles/global.css). No gold — retired from the brand.
const ACCENT = '#1a8fd6', TEXT = '#0e1116', MUTED = '#2c303b', BG = '#f7f7f3';

const text = JSON.parse(await readFile(p('brand/og-text.json'), 'utf8'));

// --- logo, nested as real vector -------------------------------------------
const logoSrc = await readFile(p('public/logo-on-light.svg'), 'utf8');
const vb = logoSrc.match(/viewBox="([\d.\- ]+)"/);
if (!vb) throw new Error('logo-on-light.svg has no viewBox — run `npm run build:brand` first');
const [, , lw, lh] = vb[1].split(' ').map(Number);
const logo = logoSrc
  .replace(/^<\?xml[^>]*\?>\s*/, '')
  .trim()
  .replace(
    /<svg\b[^>]*>/,
    `<svg x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_W}" height="${(LOGO_W * lh / lw).toFixed(2)}" ` +
      `viewBox="${vb[1]}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
  );

// --- portrait, embedded ----------------------------------------------------
// The source PNG is stored with weak compression; re-encoding is lossless and
// takes it from ~207KB to ~57KB, which matters once it is base64 in the SVG.
const portraitPng = await sharp(p('public/uploads/portraitLight.png'))
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();
const portrait = `data:image/png;base64,${portraitPng.toString('base64')}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Social preview card. Built by scripts/build-og.mjs — do not hand-edit;
       regenerate instead. Self-contained: outlined type, nested logo vector,
       embedded portrait. -->
  <defs>
    <linearGradient id="ogSky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG}"/>
      <stop offset="0.55" stop-color="#eef4fa"/>
      <stop offset="1" stop-color="#e3eef8"/>
    </linearGradient>
    <linearGradient id="ogCard" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.18"/>
      <stop offset="0.45" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <radialGradient id="ogRise" cx="0.5" cy="1" r="0.75">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ogHalo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ogCardClip"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${PR}"/></clipPath>
    <filter id="ogShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#16191f" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#ogSky)"/>

  <circle cx="${PX + PW / 2}" cy="${PY + PH / 2}" r="300" fill="url(#ogHalo)"/>
  <g fill="${ACCENT}" fill-opacity="0.45">
    <circle cx="700" cy="140" r="3"/><circle cx="1150" cy="596" r="2.6"/><circle cx="726" cy="540" r="2.4"/>
  </g>

  <!-- portrait card: the cut-out needs a backdrop, so this rebuilds the
       homepage hero's scene behind it -->
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${PR}" fill="#ffffff" filter="url(#ogShadow)"/>
  <g clip-path="url(#ogCardClip)">
    <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="url(#ogCard)"/>
    <ellipse cx="${PX + PW / 2}" cy="${PY + PH}" rx="${PW * 0.75}" ry="${PH * 0.55}" fill="url(#ogRise)"/>
    <g fill="none" stroke="${ACCENT}" stroke-opacity="0.28">
      <ellipse cx="${PX + PW / 2}" cy="${PY + PH * 0.46}" rx="${PW * 0.52}" ry="${PH * 0.17}" transform="rotate(-18 ${PX + PW / 2} ${PY + PH * 0.46})"/>
      <ellipse cx="${PX + PW / 2}" cy="${PY + PH * 0.46}" rx="${PW * 0.38}" ry="${PW * 0.38}"/>
    </g>
    <g fill="${ACCENT}" fill-opacity="0.5">
      <circle cx="${PX + 44}" cy="${PY + 62}" r="2.8"/><circle cx="${PX + PW - 52}" cy="${PY + 44}" r="2.2"/>
      <circle cx="${PX + PW - 36}" cy="${PY + 196}" r="2.8"/><circle cx="${PX + 30}" cy="${PY + 238}" r="2.2"/>
    </g>
    <image xlink:href="${portrait}" href="${portrait}" x="${PX}" y="${PY}" width="${PW}" height="${PH}" preserveAspectRatio="xMidYMax slice"/>
  </g>
  <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="${PR}" fill="none" stroke="${ACCENT}" stroke-opacity="0.22" stroke-width="2"/>

  ${logo}

  <rect x="${M}" y="168" width="72" height="7" fill="${ACCENT}"/>
  <path d="${text.lead}" fill="${ACCENT}"/>
  <path d="${text.rest}" fill="none" stroke="${ACCENT}" stroke-width="2.4"/>
  <path d="${text.hook}" fill="${ACCENT}"/>
  <path d="${text.tag1}" fill="${MUTED}"/>
  <path d="${text.tag2}" fill="${MUTED}"/>
  <path d="${text.url}" fill="${TEXT}"/>
</svg>
`;

await writeFile(p('public/og.svg'), svg);
console.log('Wrote public/og.svg', svg.length, 'bytes');

// Rasterise from a Buffer on purpose: if that still renders the portrait, the
// file genuinely carries everything it needs.
const png = await sharp(Buffer.from(svg), { density: 144 })
  .resize(W, H, { fit: 'fill' })
  .png({ compressionLevel: 9 })
  .toBuffer();

const meta = await sharp(png).metadata();
if (meta.width !== W || meta.height !== H) {
  throw new Error(`og.png must be ${W}x${H}, got ${meta.width}x${meta.height}`);
}
await writeFile(p('public/og.png'), png);
console.log('Wrote public/og.png', `${meta.width}x${meta.height}`, png.length, 'bytes');
