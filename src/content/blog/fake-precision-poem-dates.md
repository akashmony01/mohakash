---
title: "Building with Claude: Fake Precision, and Why My Poems Only Show the Year"
date: 2026-06-19T13:00:00Z
category: "Building with Claude"
excerpt: "My imported poems had invented dates — some of them in the future. Fixing the ordering turned into a small lesson about not displaying data you don't actually have."
---

While cleaning up my poetry section, I noticed something odd: my poems were dated
December 2026. It's June. My poems were time-traveling. Untangling that turned
into one of those small problems that teaches a disproportionately useful lesson.

## The problem we were solving

When my 55 Bengali poems were first imported, only the **year** was known for each
one — no month, no day. To get them to sort newest-first, an earlier step had
assigned each a synthetic date: December 31, then December 30, counting down. It
worked for ordering, but it produced two problems. The 2026 poems were dated in
**December** — months in the future. And the made-up days implied a precision I
never actually had.

I'd also just added a new poem, *shoishob*, and wanted it at the top of the list.

## What Claude suggested

My instinct was to give the new poem today's date — June 18 — to bring it first.
Claude caught that this would do the opposite: since the other poems were
synthetically dated to *December* 2026, a June date would sort *below* all of
them. The list was sorted by full date, and December beats June.

So we did two things. First, a small script re-dated every poem with realistic,
**non-consecutive** dates (random 1–3 day gaps), while preserving two hard
constraints: each poem keeps its real **year**, and the existing **order** never
changes. The newest 2026 poem anchored at June 18; the rest walked backward from
there; past years anchored at their own December and walked back.

Then, the part I actually like: we changed the display to show only **month and
year**, never the day:

```js
const fmt = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
```

The full date still lives in the frontmatter — it's needed for sorting — but the
page only ever shows "June 2026." Because honestly, a poem isn't a single-day
event. Some take days to write. Claiming an exact date would be inventing a fact.

There was also a neat trick for the ordering. To make *shoishob* sort above
another poem on the same day without a cascade of edits, I gave it a later
**time** on the same date:

```yaml
# sorts first, still displays "December 2026"
date: 2026-12-31T23:59:59Z
```

(That was an intermediate step; in the final pass it became June 18, the newest of
the bunch.)

## What I got wrong

I assumed a recent, real-looking date would float the poem to the top. I was
reasoning about *calendar* recency, but the system was sorting against a set of
*fake* dates, so my real date sank. I didn't realize the data I was comparing
against wasn't real.

I also instinctively wanted full dates on display — they look more "complete." But
complete-looking and true aren't the same thing.

## What Claude got wrong

This mess existed because of an earlier decision Claude itself had made: dating the
poems into **December 2026**, the future, was sloppy. Anchoring synthetic dates at
year-end is fine for past years, but for the *current* year it produces dates that
haven't happened yet. The ordering scheme should have anchored at "today" for the
current year from the start. I inherited a future-dated archive and had to fix it.

## What we solved

- Every poem now has a believable, non-consecutive date in its correct year — no
  more future dates.
- The new poem sits exactly where I want it (first), with the order of all the
  others untouched.
- The site displays **month + year only**, so it never claims a specific day it
  can't back up. The frontmatter keeps the full date for sorting.

## Key lessons learned

1. **Don't display data you don't actually have.** Showing only the year (or
   month + year) is more honest than inventing a day. Honest metadata beats
   fake precision.
2. **Sorting is about the stored value, not the visible one.** My "recent" date
   lost to invented December dates because the sort compared full dates, not what
   the page showed.
3. **Use a time component to break ties without re-numbering everything.** A
   `T23:59:59Z` nudge sorts one item above another on the same day — no cascade
   of edits.
4. **Separate the value from its display.** Keep precise data for the machine
   (sorting), show only what's true to the human (the year).
