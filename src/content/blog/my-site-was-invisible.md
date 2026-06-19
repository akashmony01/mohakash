---
title: "Building with Claude: My Site Was Invisible, and It Wasn't the Code's Fault"
date: 2026-06-19T17:00:00Z
category: "Building with Claude"
excerpt: "My site was live and SEO-perfect, but ChatGPT and Perplexity couldn't reach it and Google had indexed zero pages. The culprit wasn't the code — it was Cloudflare quietly blocking AI crawlers at the edge."
---

I built a clean personal site, deployed it, and then nobody could find it. Not
Google when I searched my own name, not ChatGPT, not Perplexity — the only query
that surfaced it was typing "mohakash xyz" literally. So I sat down with Claude
and asked the obvious question: *why can't anyone find a site that's clearly
online?*

## The problem we were solving

The site was up. It had a title, meta description, canonical tags, Open Graph
cards, JSON-LD structured data, a sitemap, the works. On paper the SEO was
textbook. And yet: AI assistants couldn't read it, and Google's index had
**zero** pages from the domain. Something was wrong below the level of "write
better content."

## What Claude suggested

Instead of theorizing, Claude tested the site the way a crawler actually sees it
— hitting it with different bot user-agents and reading the raw HTTP status
codes:

```bash
for ua in "Googlebot/2.1" "GPTBot/1.1" "ClaudeBot/1.0" "PerplexityBot/1.0"; do
  curl -s -o /dev/null -w "%{http_code}  $ua\n" -A "Mozilla/5.0 (compatible; $ua)" https://mohakash.xyz/
done
```

The result was the whole story in four lines:

```text
200  Googlebot/2.1
403  GPTBot/1.1
403  ClaudeBot/1.0
403  PerplexityBot/1.0
```

Browsers and Googlebot got `200 OK`. Every AI crawler got `403 Forbidden`. The
site was *deliberately* slamming the door on ChatGPT, Claude, and Perplexity —
and I had no idea.

The reason was **Cloudflare**. I'd flipped on its "Block AI bots" feature at some
point without thinking about it. It does two things: it returns a plain-text
`blocked` 403 to AI user-agents at the edge, and it silently prepends its own
block to your `robots.txt`:

```text
# BEGIN Cloudflare Managed content
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
...
```

So even though *my* `robots.txt` warmly welcomed AI crawlers, Cloudflare was
stapling a "go away" on top of it. The fix wasn't code at all — it was a
dashboard toggle. Turn off "Block AI bots," and the 403s became 200s within
minutes.

The second half of the problem was Google. `site:mohakash.xyz` returned nothing,
because I'd never told Google the site existed. The fix: verify the domain in
Google Search Console with a DNS TXT record, submit the sitemap, and request
indexing.

## What I got wrong

I assumed "not findable" meant "bad SEO." I was ready to rewrite copy, stuff
keywords, tweak meta tags — all the content-level stuff. None of it would have
mattered, because the requests were being rejected before they ever reached my
content. I was about to optimize a room nobody could open the door to.

I also assumed a brand-new site *should* rank for my name. But "Mohammed Akash"
is an extremely common name, and a week-old domain with zero backlinks has no
authority. Even with everything fixed, ranking for the bare name is a months-long
game — the winnable targets are distinctive terms like "moh akash" or "mohakash
infinite sky," not the common name.

## What Claude got wrong

Claude told me to submit my sitemap to Google Search Console by typing just the
filename, `sitemap-index.xml`. I tried it and Search Console threw "Invalid
sitemap address." It turned out that on a **Domain property**, the box doesn't
pre-fill your domain, so you have to paste the **full URL**:

```text
https://mohakash.xyz/sitemap-index.xml
```

Small thing, but it cost me a few confused minutes, and Claude stated the wrong
version confidently. Good reminder that even a careful assistant can be wrong
about a UI detail — and that the error message ("invalid address," not "couldn't
fetch") was actually telling me it was a *format* problem all along.

## What we solved

- AI crawlers can now reach and cite the site (verified: ClaudeBot, GPTBot,
  PerplexityBot all return `200`).
- A clean `robots.txt` policy: allow search and AI *retrieval/citation*, disallow
  AI *training* (`Content-Signal: search=yes, ai-input=yes, ai-train=no`).
- Google Search Console verified, sitemap submitted, indexing requested.
- Bing covered too (it imports straight from Search Console in one click).

## Key lessons learned

1. **"Not found" is often infrastructure, not content.** Before touching SEO copy,
   check the actual HTTP response a crawler gets. A 403 beats any amount of
   keyword tuning.
2. **Your platform can override your code.** Cloudflare was editing my `robots.txt`
   and blocking bots at the edge — none of which lived in my repo. Know what your
   host does by default.
3. **Test like the client, not like yourself.** The site looked perfect in my
   browser because my browser wasn't the one being blocked. One `curl` with a bot
   user-agent revealed what no amount of clicking around would.
4. **A new domain with a common name needs time and backlinks.** Getting indexed
   is step one; ranking is a separate, slower game. Aim at distinctive terms
   first.
