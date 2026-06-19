---
title: "Building with Claude: Don't Delete Your Old Site — Redirect It"
date: 2026-06-19T15:00:00Z
category: "Building with Claude"
excerpt: "I had an old portfolio sitting on a github.io domain and wanted it gone. Claude talked me out of deleting it — and out of the duplicate-content trap I was about to walk into."
---

I have an old freelancer portfolio living at `akashmony01.github.io`. Now that
I've built a new site, I wanted to clean up the old one — and I was about to do it
the wrong way twice. This is the conversation that saved me from both mistakes.

## The problem we were solving

I needed a GitHub profile README, and I thought the old portfolio repo was in the
way. My plan, roughly: make the old site's homepage look exactly like my new
homepage, link everything over to the new domain, and call it a "branded entry
point." Failing that, just delete the old site entirely.

## What Claude suggested

First, Claude untangled a misconception I didn't know I had. The **profile README**
lives in a repo named exactly after your username (`akashmony01/akashmony01`) and
renders on your GitHub profile. The **old site** lives in a *different* repo
(`akashmony01.github.io`). They're unrelated — I didn't need to touch the old site
to get a README at all.

Then came the part that mattered. My "make it look like the new homepage" idea was
a **duplicate-content trap**. If two domains serve the same page, Google has to
pick one to rank — and the older, higher-authority `github.io` domain could win,
*burying my actual site with a copy of itself.* You'd be competing against
yourself, and losing.

The right move was a clean redirect. Don't copy the content — point at it:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Mohammed Akash — now at mohakash.xyz</title>
  <link rel="canonical" href="https://mohakash.xyz/" />
  <meta http-equiv="refresh" content="0; url=https://mohakash.xyz/" />
  <script>window.location.replace("https://mohakash.xyz/");</script>
</head>
<body>
  <p>This site has moved to <a href="https://mohakash.xyz/">mohakash.xyz</a>.</p>
</body>
</html>
```

The `rel="canonical"` line is the important one: it tells Google "the real version
lives at mohakash.xyz," so the old page passes its authority along instead of
competing. And because `github.io` is a high-trust domain, that redirect is
actually a *good backlink* for the new site.

For the cleanup itself, Claude suggested preserving the old site on a branch and
stripping `main` down to just the redirect:

```bash
git checkout main
git checkout -b old-portfolio   # keep the old site safe
git push -u origin old-portfolio
git checkout main
git rm -rf .                    # strip main to nothing
# add the redirect index.html, then:
git commit -m "Redirect old site to mohakash.xyz"
git push origin main
```

## What I got wrong

Two things. First, I assumed the old site was *clutter* — something to erase.
It's not; it's **equity**. It's older than my new domain and probably already
indexed, so it carries SEO weight I'd be throwing away by deleting it.

Second, my "make it identical" instinct felt clever but was actively harmful.
Cloning the homepage would have split my search signals across two domains instead
of consolidating them onto one. The thing that *felt* like more presence was
really self-sabotage.

## What Claude got wrong

Before handing me redirect steps, Claude assumed it was a plain static site. It
wasn't — it was a **Jekyll** site, which changes how GitHub Pages serves files
(an `index.html` can clash with Jekyll's `index.md`). Claude only caught this
after I pushed back and it actually inspected the repo. It should have checked the
repo structure *first* instead of giving generic instructions and correcting them
after. The lesson cuts both ways: verify the thing in front of you before
prescribing steps for it.

## What we solved

- The old portfolio now instantly redirects to `mohakash.xyz`, passing its
  authority along instead of competing with it.
- The old site is preserved on an `old-portfolio` branch — nothing lost.
- A profile README went up in the correct repo, with a real backlink to the new
  site.
- Zero Cloudflare involvement: the old site is on GitHub Pages, so it was all
  GitHub, no DNS changes.

## Key lessons learned

1. **An old site is an asset, not trash.** Redirect it to pass authority and
   capture its existing traffic; deleting throws that away.
2. **Never duplicate a page across two domains.** It's a canonicalization
   gamble you can lose — the wrong copy ranks. Link, don't clone.
3. **`rel="canonical"` is how you redirect a static host.** GitHub Pages can't do
   a real 301, but a meta-refresh plus a canonical tag passes the signal cleanly.
4. **A no-click redirect beats a "click here to continue" page.** It forwards
   instantly *and* does the same SEO work, with less friction for the visitor.
