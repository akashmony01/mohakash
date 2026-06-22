---
title: "How I get Claude to write my project posts (and what I still get wrong)"
date: 2026-06-22
category: "Building with Claude"
excerpt: "A reusable prompt I keep in my back pocket: point Claude at a codebase, get back a publish-ready case study — without leaking secrets. Here's the prompt, plus where I trip up and where Claude does."
draft: false
hidden: false
---

Every time I finish a project, there's a small tax I never want to pay: writing it up. The code is done, it works, I'm proud of it — and then I have to sit down and explain it to strangers without sounding like a résumé. I kept avoiding it, so the work just piled up undocumented.

So I did the obvious thing: I made the explaining repeatable. I wrote one prompt that I keep around, and now writing a project post is a two-minute job instead of an afternoon I keep postponing. This post is that prompt, plus the honest version of how it actually goes — what I have to get right, and what Claude still gets wrong.

## How I actually use it

The flow is dead simple. I open Claude *inside the project I want to write about* — not in my site repo, but in the actual codebase. That matters: Claude can read the real `package.json`, the real source, the real config, so the post is grounded in what I actually built instead of what I vaguely remember building. Then I paste the prompt below and let it read around.

What comes back is a single Markdown file with the right frontmatter that drops straight into my site's `projects` folder. No reformatting, no fixing field names. If the live URL or repo is right, it ships.

## What I have to get right

The prompt does a lot, but it can't read my mind. The things that are on *me*:

- **Pick the right directory.** Garbage in, garbage out. If I run it somewhere with no real code, I get a vague post.
- **Sanity-check the facts.** Claude writes confidently. I'm the one who knows whether that "sub-50ms cold start" number is real or a nice-sounding guess. I read every claim before it goes public.
- **Decide what's actually mine to share.** Some projects are under NDA or have a private repo. The prompt asks Claude to flag what it left out, but the final call on confidentiality is mine, every time.

## What Claude tends to get wrong

Being honest, because pretending the tool is perfect helps nobody:

- **It invents plausible URLs.** Left unchecked, it'll cheerfully add a `repo` or `link` that doesn't exist. That's why the prompt explicitly says *don't invent URLs, flag it instead* — and I still double-check.
- **It over-claims.** Adjectives creep in ("blazingly fast", "seamless"). I push it toward concrete numbers, and I delete the fluff it sneaks back in.
- **It can be too thorough about internals.** Ask a model to "showcase the engineering" and it'll happily paste your auth logic or your schema. That's the single biggest risk in writing publicly about your own code — so a big chunk of the prompt is just guardrails telling it *not* to.

That last point is the real reason this prompt is longer than "write a post about this project." The security section isn't decoration. A public case study is a map of your system; you want it to show the architecture, not the locks.

## Why this might help you too

If you build things and never write them up, steal this. It works for portfolio sites, but the shape is general — point a model at a repo, give it a strict output contract (exact fields, voice, length), and give it hard *don't* rules around secrets and internals. The contract is what turns a chatty assistant into something that produces a file you can actually use.

Here's the whole thing. Adapt the frontmatter to wherever you publish:

````markdown
# Task: Write a project case-study post for my portfolio site

You are working inside one of my software projects. I want you to write a **project showcase post** about *this* project, to publish on my personal site (mohakash.xyz). The post is a single Markdown file with YAML frontmatter. Read enough of this codebase to write accurately — README, package manifest, main source dirs, config, and any docs — then produce the file.

## Deliverable

Output one Markdown file. At the very end, also tell me the filename you'd save it as.

- **Filename:** `<short-kebab-slug>.md` (e.g. `realtime-chat-app.md`). The slug becomes the URL, so keep it short, lowercase, hyphenated, no dates.
- The file has **YAML frontmatter** (between `---` fences) followed by a **Markdown body**.

## Frontmatter — use exactly these fields

```yaml
---
title: "Human-readable project name — short tagline"
summary: "One or two sentences, ~25–40 words. Shown on the projects index and used as the SEO/meta description and social-card text. Make it concrete and skimmable."
stack: ["Tech", "Names", "Here"]   # array of the real technologies used (frameworks, languages, infra, notable libraries). 4–8 items.
year: 2026                          # number, the year built/shipped. Omit if unknown.
featured: false                     # true only if it's a flagship; default false
order: 10                           # sort order on the index (lower = earlier). Use 10 unless told otherwise.
link: "https://..."                 # OPTIONAL live/demo URL. Omit the line entirely if none.
repo: "https://..."                 # OPTIONAL public repo URL. Omit the line entirely if the repo is private.
cover: ""                           # OPTIONAL image path under /uploads. Leave out unless I give you one.
resources:                          # OPTIONAL list of links/files; omit the whole block if none
  - { label: "Live demo", href: "https://...", kind: live }   # kind ∈ link | pdf | code | live | doc
hidden: false
---
```

Rules:
- Only include `link`/`repo`/`cover`/`resources` if they genuinely apply. **Do not invent URLs.** If you're unsure whether the repo is public, leave `repo` out and flag it to me.
- `stack` should reflect what's actually in the codebase, not aspirational tech.

## Body — structure and voice

Write in **GitHub-flavored Markdown**. The site renders `##` and `###` as section headings, supports lists, **bold**, *italics*, `inline code`, fenced code blocks (syntax-highlighted, dark theme), blockquotes, and images. Do **not** put an H1 in the body — the title comes from frontmatter.

Match this voice (taken from an existing post on the site): first person, confident but not boastful, plain language, concrete decisions over buzzwords. Short sections with descriptive headings. Aim for **400–700 words**.

Cover these beats (adapt headings to the project — don't copy them verbatim):

1. **The goal / the brief** — what problem this solves and for whom. What "done well" looked like.
2. **What I built** — a clear picture of the thing itself and the notable features.
3. **The stack & why** — the key technologies and *why* each was chosen (trade-offs I'd defend, not just a list).
4. **How I pulled it off** — the interesting engineering: the hard parts, the approach, anything I'm proud of. This is where my skills should show.
5. **The result / outcome** — what shipped, impact, what I learned or would do next.

Show range and judgment: architecture decisions, performance/UX/accessibility considerations, testing, CI/CD, or whatever this project actually exercised. Favor specifics ("cut cold-start to under 50ms by…") over adjectives ("blazingly fast").

## Security & confidentiality — hard constraints

This post is **public**. Showcase the skill and the design thinking, but never expose anything exploitable. Specifically:

- **No secrets:** no API keys, tokens, passwords, connection strings, private endpoints, bucket names, internal hostnames, or env-var *values*. Don't even include redacted placeholders that reveal the format.
- **No attack surface:** don't reproduce the actual auth/authorization logic, security checks, rate-limiting rules, validation/sanitization internals, cryptographic implementation, or anything that, if known, makes the system easier to break. Describe *that* a measure exists and *why*, never the exact mechanism that could be circumvented.
- **No sensitive internals:** don't paste real database schemas, full file/architecture trees, proprietary algorithms, or business logic that's a competitive or security risk. Generalize instead ("a queue-backed worker handles X") rather than reproducing it.
- **Code samples:** only include short, illustrative snippets that are safe to publish — public API usage, generic patterns, config that contains no secrets. When in doubt, describe in prose instead of pasting code.
- **No private data:** no real user data, internal URLs, customer names, or anything under NDA.

If something is genuinely worth mentioning but borderline, **abstract it** to the level of intent ("validates uploads before processing") rather than implementation, and add a short note to me at the end listing anything you deliberately omitted or generalized for security so I can double-check.

## Final output

1. The complete `.md` file (frontmatter + body) in one code block.
2. The suggested filename.
3. A brief "Omitted for security" note listing anything you held back or generalized, and any frontmatter field (like `repo`) you left out because you weren't sure.
````

That's it. The whole point is that the boring part of finishing a project — telling people what you did — stops being the part you dread.
