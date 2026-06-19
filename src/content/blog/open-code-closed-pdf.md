---
title: "Building with Claude: Open Code, Closed PDF — Sharing Research Without Getting Scooped"
date: 2026-06-19T09:00:00Z
category: "Building with Claude"
excerpt: "I wanted to put two research papers on my site — one published, one not. Each raised a different question about what you can share, and the answers weren't what I expected."
---

I wanted to add two research papers to my site: a published conference paper, and
my still-unpublished undergraduate thesis. I assumed "put the PDF up" for both.
Each one turned out to need a different decision, and thinking them through changed
how I see the trade-off between visibility and protection.

## The problem we were solving

Two papers, two situations:

- A **published** IEEE conference paper on Banglish spell correction. Done, peer
  reviewed, out in the world.
- An **unpublished** thesis comparing imputation and clustering pipelines on
  incomplete suicide data. Defended, but no formal paper yet.

My default for both was the same: host the PDF, add a download button. For both,
that default was wrong — for opposite reasons.

## What Claude suggested

For the **published** paper, the issue was copyright. The camera-ready PDF carries
the IEEE header and IEEE's copyright. Self-hosting that exact file isn't really
mine to do — publishers let you share an accepted manuscript or link to the
official page, but not redistribute their typeset version. So instead of a hosted
file, the post links to IEEE Xplore as the source. Visibility without violating
anyone's rights.

For the **unpublished** thesis, my worry was the opposite: if I post the whole
thing, can someone steal it before I publish a formal paper? Claude's reframing was
the useful part. The work's **code and dataset were already public** on GitHub
under open licenses — so hiding the writeup protected almost nothing. And a public,
dated, attributed document doesn't *expose* you to theft; it **establishes
authorship**. Priority is protected by publishing first with your name on it, not
by hiding. A thesis is also a legitimate scholarly output that doesn't block a
later journal submission.

We still chose the cautious middle path — show the abstract and link the GitHub
repo, hold the full PDF until a formal paper lands:

```yaml
type: paper
abstract: >-
  An exploratory study on 1,617 newspaper-reported suicide cases...
link: https://github.com/akashmony01/imputation-clustering-comparison
```

So: published paper, link out (copyright). Unpublished thesis, share the substance,
hold the PDF (caution, not fear).

## What I got wrong

I treated "share research" as one decision with one answer. It's at least two
different decisions — *can I legally share this?* (copyright) and *should I share
this yet?* (strategy) — and they pull in different directions for different
papers. I'd have either broken IEEE's copyright on one or needlessly hidden my own
work on the other.

I also had the protection logic backwards on the thesis. I thought visibility was
the *risk*. For authorship, visibility is the *defense*: the public, timestamped,
attributed version is the thing that proves the work is yours.

## What Claude got wrong

Claude initially just hosted both PDFs and wired up download buttons — it built the
straightforward version first and only raised the IEEE copyright problem
*afterward*. That flag should have come **before** publishing the file, not after.
When something touches copyright or "is this even mine to post," that's a question
to ask up front, not a footnote once it's already live.

## What we solved

- The published paper links to IEEE Xplore — visible, properly credited, no
  copyright issue.
- The unpublished thesis shows its abstract and links its open code and data, with
  the full writeup held back until formal publication — a deliberate choice, not a
  fearful one.
- I now have a cleaner mental model for putting research online.

## Key lessons learned

1. **"Can I share this?" and "should I share this?" are different questions.**
   One is about copyright, the other about strategy. Answer both, separately.
2. **Don't self-host a publisher's PDF.** Link to the official page; share an
   accepted manuscript if you need the text. The typeset version isn't yours to
   redistribute.
3. **Visibility protects authorship — it doesn't endanger it.** A public, dated,
   attributed document is evidence the work is yours. Hiding it protects nothing,
   especially when the code is already open.
4. **Flag the legal/ethical question before you ship, not after.** If something
   touches copyright or ownership, raise it up front.
