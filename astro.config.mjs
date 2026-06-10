// @ts-check
import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Keystatic (the CMS) only loads in `npm run cms`, which sets KEYSTATIC=true.
// It injects on-demand admin routes, so we keep it out of the normal static
// build — `npm run build` / `npm run dev` stay fully static with no adapter.
//
// Tailwind v4 runs via PostCSS (postcss.config.mjs) rather than the Vite
// plugin, which currently clashes with Astro 6's rolldown-based Vite.
// https://astro.build/config
const enableCMS = process.env.KEYSTATIC === 'true';

export default defineConfig({
  site: 'https://mohakash.xyz',
  integrations: [alpinejs(), ...(enableCMS ? [react(), keystatic()] : [])],
});
