---
title: "Building with Claude: Simplicity Wins When You're Building for Editors"
date: 2026-06-24
category: Building with Claude
excerpt: "I spent today turning a pile of hardcoded UI into something a non-technical person can actually edit — headers, footers, navigation menus, little accreditation badges. It sounds simple. It mostly wasn't, and almost every snag came from the same place: assuming the happy path instead of checking what was really going on under the hood."
draft: false
hidden: false
cover: ''
featured: true
resources: []
---

## Opening Hook

I spent today turning a pile of hardcoded UI into something a non-technical person can actually edit — headers, footers, navigation menus, little accreditation badges. It sounds simple. It mostly wasn't, and almost every snag came from the same place: assuming the happy path instead of checking what was really going on under the hood.

## The Problem We Were Solving

The category here is **CMS content modeling and editor-facing admin UX**. You have a marketing site where the header, footer, and navigation are baked into templates. Every change means a developer editing code. The goal is to move all of that into structured, editable settings so a content editor can manage links, logos, badges, and menus from an admin panel without touching anything.

This matters more than it looks. The moment you expose configuration to a non-developer, every field becomes a small contract: "here is a thing you control, and here is what it does." If a field doesn't do what its label says, or there are two ways to accomplish one thing, or a slot exists that shows up nowhere — you've built confusion, not flexibility. The hard part isn't the code. It's the modeling: deciding what's a field, what's a reusable object, and what's just noise.

Bolted onto this was a second category — a **content migration** from an older platform — and a bunch of **front-end component work**: dropdown menus, a mobile accordion, conditional styling.

## What I Tried First (The Approach)

My default instinct all day was to **rip out complexity**. Every time I looked at the data model I asked, "do we actually need this?" A separate menu slot that only fed the mobile drawer? Delete it — the mobile drawer can just reuse the main menu. Two logo fields, one "normal" and one "inverted for dark backgrounds"? I never asked for two; collapse to one. A `theme_color` field I changed and saw nothing happen? Why is it even here.

The mental model I kept pushing was: **a field should map directly to something the editor can see and understand, and there should be exactly one way to do each thing.** Reusable abstractions are seductive for developers ("look, you can share this menu object in three places!"), but for an editor they're indirection — now you create a thing over *here* and select it over *there*, and you have to remember which is which.

So the pattern became: replace "pick a reusable object" slots with plain inline lists living right where they're used. Concretely, instead of:

```
header.members_menu  ->  (pick a Menu object created elsewhere)
```

I wanted:

```
header.member_links  ->  [ {label, url}, {label, url}, ... ]   # edited right here
```

It reads better, it has no spooky-action-at-a-distance, and a new editor groks it in five seconds. That instinct was correct and it caught several genuine over-builds — including a field that was *defined but never rendered anywhere*, the textbook dead weight.

## What I Got Wrong

My mistakes were mostly **fuzzy memory of prior state**. The worst offender was a small badge — a flag plus a label. I described how it "used to" look (background, then flag, then text, stacked) and asked to restore that. But the original asset wasn't three separate things at all; it was a single self-contained graphic with the label *baked into the image*. So when I insisted on "just reuse that asset and add the text field," we'd have ended up showing the label twice. We cycled on that badge three or four times before it was right, purely because I was building from a recollection of the design rather than the design itself.

I also tripped on a tooling concept: at one point I worried that git-ignoring a file would delete it. It doesn't — it just stops tracking it; the file sits right there on disk. Small thing, but it momentarily steered a decision about whether I could still re-run a step locally.

The pattern in my own errors: I'd state how something "should" be from memory, and that confidently-wrong starting point would send the next step sideways until somebody checked reality.

## What Claude Got Wrong

Claude's mistakes shared a single root cause that's worth naming: **it assumed the happy path instead of verifying the actual runtime state or data shape.** Three concrete examples.

First, renaming a parent page's URL slug. Claude changed the slug and moved on. Pages still *loaded* at the new address, so it looked done — but the framework caches a computed URL path on every child record, and those weren't refreshed. Every generated link still pointed at the *old* path. The fix is two lines that were simply forgotten:

```python
parent.slug = new_slug
parent.save()
parent.refresh_from_db()                         # was skipped
parent._update_descendant_url_paths(old, new)    # was skipped
```

Routing-by-name masked the bug, which is exactly why it shipped.

Second, the migration. The source pages used lazy-loaded images, so the real `<img>` `src` was a tiny placeholder data-URI and the actual file lived in a `data-src` attribute. Claude grabbed `src`, got the placeholder, and silently dropped a bunch of inline images. It hadn't anticipated lazy-loading at all.

Third, and related: it then imported the featured image *and* the same file again as an inline body image, duplicating it on the page. No deduplication until I pointed at the obvious double image.

And a smaller one: it shipped an element carrying both a `hidden` and a `flex` class — two conflicting `display` rules — in a collapsible menu. A linter caught it, not Claude. That combination can leave a "collapsed" panel stuck open depending on stylesheet order.

None of these were exotic. They're all "the real world is messier than the diagram" bugs, and each one survived because the thing *appeared* to work on the surface.

## What We Actually Solved

The work that stuck had a different rhythm: **scrape one real example, dump the actual output, and test against constructed inputs before trusting anything.**

For the migration, the turning point was pulling a single real record, printing the raw HTML, and *seeing* the lazy-load placeholder. Once the real shape was visible, the fix was obvious: prefer the lazy attribute, fall back to `src`, and skip data-URIs entirely.

```python
def real_image_url(img):
    for attr in ("data-src", "data-lazy-src", "srcset", "src"):
        val = (img.get(attr) or "").split(",")[0].strip()
        if val and not val.startswith("data:"):
            return val
    return ""
```

For the validation work — making a menu item's link required only when it has no children — the win came from *testing the rule against constructed values* rather than reasoning about it:

```python
def clean(self, value):
    result = super().clean(value)
    has_children = bool(result.get("children"))
    has_link = any(result["link"].get(f) for f in LINK_FIELDS)
    if not has_children and not has_link:
        raise ValidationError({"link": "Leaf items need a link."})
    return result
```

Then I ran five cases (leaf+link, leaf no-link, parent+link, parent no-link, parent no-link no-label) and watched each pass or fail correctly. That five-minute check is worth more than an hour of "it should work."

And the modeling wins held up: one logo, inline link lists instead of indirection, dead fields deleted, a badge that hides cleanly when empty and shows image-or-text-or-both based on simple rules. The simplest version was always the right one.

## Key Lessons Learned

**1. For editor-facing tools, simplicity beats flexibility — every time.** A field should do exactly what its label says, and there should be one way to accomplish each task. Indirection that delights developers (reusable objects, clever slots) is a tax on the non-developer who actually maintains the content. When in doubt, inline it.

**2. Verify the real data; never reason from the diagram.** Lazy-loaded markup, duplicate assets, weird attribute names — the source is always messier than you imagine. Scrape one real record and *look at it* before writing the parser. The fastest path through migration work is empirical, not theoretical.

**3. Frameworks cache more hidden state than you think.** Cached URL paths, denormalized fields, computed values on child records — renaming or moving something often requires an explicit cascade. "It loads fine" is not proof it's correct; check the *generated* output (links, references), not just whether the page renders.

**4. Test the rule, not your belief about the rule.** Conditional validation, toggles, edge cases — construct the inputs and watch the outputs. Five concrete cases beat any amount of confident reasoning, and they take minutes.

**5. Build from the artifact, not from memory.** Half my own missteps came from describing how something "used to" look instead of opening it. When restoring or matching prior work, go read the actual thing first — recollection is a confidently-wrong starting point that quietly derails the next three steps.
