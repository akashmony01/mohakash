---
title: "Static Sites Still Win"
date: 2026-06-05
category: "Dev"
excerpt: "Why a static site on Astro + Cloudflare is still the most boring, durable, and fast choice for a personal site in 2026."
---

Every few years the web rediscovers that shipping HTML is fast. Here's why I
keep choosing static for personal sites.

## No server, no rot

There's no runtime to patch, no database to back up, no bill that scales with
traffic. The output is files. Files don't rot.

```bash
npm run build   # → a folder of HTML, CSS, and a little JS
```

## Fast by default

Astro ships zero JavaScript unless you ask for it. The starfield is CSS. The
menu and contact form use a few KB of Alpine — and nothing else does.

## Durable and yours

Content lives as Markdown in git. Every change is versioned. If a platform
disappears, the site moves in minutes. That durability is the whole point.
