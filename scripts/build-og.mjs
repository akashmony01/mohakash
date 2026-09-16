// Rasterize public/og.svg -> public/og.png (1200x630 social card).
// Run after editing og.svg:  node scripts/build-og.mjs
//
// og.svg carries the background and the type (as outlines — see
// scripts/build-og-text.py). The logo mark is composited here rather than
// inlined, because the wordmark vector keeps its own ids and clip paths, and
// dropping them into another document invites collisions.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => fileURLToPath(new URL(rel, root));

const LOGO_W = 296;      // wordmark width on the card
const LOGO_X = 84;       // aligned with the text's left margin
const LOGO_Y = 78;

const card = await sharp(await readFile(p('public/og.svg')), { density: 144 })
  .resize(1200, 630, { fit: 'fill' })
  .png()
  .toBuffer();

// The light-background variant: the card sits on the off-white sky gradient.
const logo = await sharp(await readFile(p('public/logo-on-light.svg')), { density: 600 })
  .resize({ width: LOGO_W })
  .png()
  .toBuffer();

const png = await sharp(card)
  .composite([{ input: logo, left: LOGO_X, top: LOGO_Y }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(p('public/og.png'), png);
console.log('Wrote public/og.png', png.length, 'bytes');
