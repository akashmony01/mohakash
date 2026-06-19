---
title: "Building with Claude: It's Not Broken, You're Looking at the Wrong Thing"
date: 2026-06-19T11:00:00Z
category: "Building with Claude"
excerpt: "Twice in one session I was sure something was broken. Both times it was working fine — I was just measuring the wrong thing. A short post on verifying the bug before you fix it."
---

Two separate times today I told Claude "this isn't working." Both times, it was
working perfectly. The bug was in my assumption, not the code. That happens often
enough that it's worth writing down as its own small discipline.

## The problem we were solving

Two false alarms, back to back.

**Alarm one:** I added a new poem and it "wasn't showing on the site." I'd
created the file, tested locally, and saw nothing new.

**Alarm two:** We added a character limit to the excerpts on the homepage cards.
I checked the page and "saw no change" — the poem card looked exactly the same as
before.

In both cases my conclusion was the same: *the change didn't work.* In both cases
I was wrong.

## What Claude suggested

Rather than "fixing" either one, Claude checked whether they were actually broken.
For the poem, it built the site and looked at where the poem landed:

```bash
grep -oE '/poetry/[a-z0-9-]+' dist/poetry/index.html | sed 's#/poetry/##' | grep -n shoishob
# 30:shoishob
```

The poem wasn't missing — it was at **position 30**, buried in the middle of the
list because its date sorted it below 30 other poems. It was rendering fine; I
just hadn't scrolled to it. (And the reason it looked absent *locally* was a
second thing: a running `npm run dev` server doesn't always pick up a brand-new
content file until you restart it.)

For the excerpt limit, Claude measured the actual length of the text on the card:

```bash
printf '%s' "$preview" | python3 -c "import sys; print('characters:', len(sys.stdin.read()))"
# characters: 75
```

The limit was 140 characters. The poem preview was **75**. There was nothing to
truncate — the change was live and correct, it just had no effect on a string
already under the cap. The real lever wasn't the character limit at all; it was
the number of *lines* the preview showed, which was hard-capped at three.

Both "bugs" evaporated the moment we measured instead of assumed.

## What I got wrong

I trusted my eyes over the system. "I don't see it" became "it's not there," and
"it looks the same" became "it didn't work." Neither of those is a measurement —
they're impressions, and impressions are exactly what a stale dev server or an
already-short string will fool. I was ready to "fix" two things that were doing
precisely what they were supposed to.

## What Claude got wrong

To be fair to my confusion, the poem being buried at position 30 was downstream of
Claude's earlier date scheme — so part of the "it's not showing" panic traced back
to ordering choices Claude had made. And when Claude added new content files
earlier, it could have warned me up front that the dev server needs a restart to
see them. A small heads-up would have prevented one of the two false alarms before
it started.

## What we solved

- The poem was fine; we moved it to the top by fixing its date, not by "fixing" a
  non-bug.
- The excerpt limit was fine; we got the visible change I actually wanted by
  raising the line count, not the character cap.
- I picked up a reflex I keep needing: reproduce and measure the problem before
  touching anything.

## Key lessons learned

1. **Reproduce the bug before you fix it.** "I don't see it" is a starting point,
   not a diagnosis. Confirm the thing is actually broken first.
2. **Measure, don't eyeball.** A two-line script told me the preview was 75
   characters against a 140 limit. My eyes would never have known.
3. **Know your tools' quirks.** A dev server caching a new file looks identical to
   a broken file. The fix was a restart, not a code change.
4. **The real lever is often not the one you reached for.** The excerpt wasn't
   capped by characters; it was capped by line count. Find the actual constraint.
