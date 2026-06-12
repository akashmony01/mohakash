// @ts-check
import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';

// Fully static build — no adapter. Content is edited via Sveltia CMS, a static
// /admin page that commits Markdown/JSON to the repo over the GitHub API, so
// the site itself needs no server runtime.
//
// Tailwind v4 runs via PostCSS (postcss.config.mjs) rather than the Vite
// plugin, which currently clashes with Astro 6's rolldown-based Vite.
// https://astro.build/config
export default defineConfig({
  site: 'https://mohakash.xyz',
  integrations: [alpinejs()],
});
