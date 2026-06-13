// Rasterize public/og.svg -> public/og.png (1200x630 social card).
// Run after editing og.svg:  node scripts/build-og.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const svg = await readFile(fileURLToPath(new URL('public/og.svg', root)));
const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: 'cover' })
  .png()
  .toBuffer();
await writeFile(fileURLToPath(new URL('public/og.png', root)), png);
console.log('Wrote public/og.png', png.length, 'bytes');
