---
title: "mohakash.xyz — this site"
summary: "A personal site bringing my projects, poetry, research, and writing together under one open sky — built static with Astro and a git-based CMS."
stack: ["Astro", "Tailwind CSS", "Alpine.js", "Cloudflare Pages", "Sveltia CMS"]
year: 2026
featured: true
order: 0
repo: "https://github.com/akashmony01/mohakash"
resources:
  - { label: "Live site", href: "https://mohakash.xyz", kind: live }
---

## The brief

One home for several selves — developer, researcher, poet, and someone writing in
public about building with Claude. The hard part wasn't any single page; it was
making four very different kinds of content feel like *one* coherent person
rather than four stitched-together sites.

## The name does the work

*Mohakash* — **moh** for Mohammed, **akash** for Akash — also means *the infinite
sky*. That gave the whole thing a spine. The site reads like an open daytime sky:
a light, warm off-white canvas, a faint starfield, sky-blue accents over charcoal
text, serif headlines (Fraunces) above a clean sans body (Inter). A dark "night
sky" mode is one click away and remembers your choice. Bengali poetry renders in
a proper Bengali serif, so the 55 poems don't fall back to a mismatched system
font.

## Decisions I'd defend

A few choices did most of the work:

- **Subdirectories, not subdomains.** `/poetry`, `/research`, `/projects`,
  `/blog` all live in one repo and one deploy. Subdomains looked "cooler" but
  would have split SEO and tripled maintenance for no real benefit.
- **Static by default.** Built with Astro, the output is just HTML, CSS, and a
  little JavaScript. There's no server to patch and no database to back up — files
  don't rot, and the site loads instantly.
- **Just enough JavaScript.** Alpine.js handles only three things — the mobile
  menu, the contact form, and the blog category filter. Everything else is plain
  HTML.
- **Content as Markdown.** Every post and poem is a Markdown file in the repo,
  loaded through Astro's content collections with typed frontmatter, so the data
  is validated at build time.

## The CMS without a server

I wanted to edit from anywhere without standing up a backend. The answer was
**Sveltia**, a git-based CMS that runs as a static admin page and commits
straight to GitHub using a scoped personal access token — no OAuth server, no
database. Locally it edits the repo files directly. Editing a post just makes a
commit, which triggers a rebuild. Section show/hide toggles and the site's
settings (nav, socials, homepage copy) live in editable JSON, so almost
everything is changeable without touching code.

## Hosting and the moving parts

The site is hosted on **Cloudflare Pages**, which rebuilds on every push to
`main`. The two pieces that *do* need a backend run as serverless functions on
the same deploy:

- **Contact form** — a Cloudflare Pages Function that verifies a Turnstile token
  (spam protection) and sends the message via Resend.
- **Newsletter** — signups go to Kit through a small subscribe function.

One repo, one deploy, no separate server to babysit.

## Findable on purpose

A site nobody can find isn't finished. So there's a deliberate
discoverability layer: a generated sitemap, an `llms.txt` guide for AI
assistants, a `robots.txt` policy that welcomes search and citation but opts out
of AI training, JSON-LD structured data (a Person + WebSite graph, plus
per-article schema) so search engines and AI tools can resolve "Mohammed Akash"
to a clear entity, and full Open Graph / Twitter cards for link previews.

## The result

A fast, quiet space that loads instantly and reads like a single considered
voice — room for code, verse, and inquiry to sit side by side. And, fittingly,
much of it was built *in public, with Claude* — which is the subject of the blog
itself.
