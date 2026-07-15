---
title: 'Building with Claude: The Maintenance Step Was the Bug'
date: 2026-07-15
category: Building with Claude
excerpt: Today I killed a documentation page that had been lying to me for months. Not because anyone was careless — because the design required a human to remember something, and humans don't. What replaced it taught me more about testing than about documentation.
featured: false
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Today I killed a documentation page that had been lying to me for months. Not because anyone was careless — because the design required a human to remember something, and humans don't. What replaced it taught me more about testing than about documentation.

## The Problem We Were Solving

I had a component reference page in a CMS project — the kind of page you show a designer or a client to say "here's every section we can build with." It had been written by hand: someone copied the markup for each component into a template and styled it up.

It had rotted. Badly.

When I finally asked Claude to audit it, the numbers were brutal: it covered 7 things and missed **every single one of the 12 section templates**. It missed 2 of 6 shared components and roughly 48 of 55 CSS classes. It still contained a stub reading *"deferred to Phase 4"* for work that had shipped months earlier.

Nobody was lazy. The page was a copy of the codebase, and copies drift. That's the category of problem: **any artifact derived from code that a human is expected to keep in sync by hand.** Styleguides, API docs, fixture files, changelogs — same failure mode, every time.

## What I Tried First (The Approach)

My first instinct was to just rebuild it properly. Claude did that — a nice page covering everything. And then I looked at it and felt the trap.

I said something like: *"I think it's a hassle — every time we add a new block we have to regenerate this and do everything. Is there a better approach to automate this?"*

That was the real question. Because a rebuilt hand-written page is just a hand-written page with a fresher timestamp. In six months it would be exactly as wrong.

Claude's plan was to have each component declare its own preview data:

```python
class HeroBlock(StructBlock):
    def get_preview_value(self):
        return {"heading": "…", "image": some_image}   # per-component config
```

Better than copying markup — the page would read a registry instead of a list. But something still nagged at me. That `get_preview_value` is *still* hand-maintained. Add a field to the component, and the preview quietly goes stale. Nothing tells you. It's the same disease with better manners.

So I floated three ideas:

1. Use a generic placeholder image instead of hunting for real ones.
2. Store the preview values in a JSON field so they're data, not code.
3. **Find which page actually uses a component, and pull the content from there.**

Number three was the one I cared about, and I said why: *"this is to keep the thing packageable later on."* If there's no per-component code, the whole thing lifts into a reusable package.

## What I Got Wrong

The JSON field idea was wrong, and Claude was right to push back.

My reasoning was: a package can't ship code changes into someone else's components, so make the previews *data*. But Claude pointed out that a JSON blob is the same drift problem wearing a new hat — add a field to a component, and the stored JSON is silently stale, with nothing to flag it. It's also untyped, unversioned, and invisible in a code review.

I'd solved for the wrong constraint. I was thinking "how does a package inject config?" when my own idea #3 had already made config unnecessary.

I was also wrong about needing a placeholder image up front. I assumed a missing image would break the render. It doesn't — the framework's image tag renders empty rather than raising. So placeholders were a fallback, not a foundation. I'd promoted an edge case into a requirement.

What changed my mind on both: Claude tested them instead of arguing. Ten seconds of evidence beat ten minutes of debate.

## What Claude Got Wrong

This is the interesting part, because Claude's mistakes all shared one shape: **it tested the mechanism it built, not the risk it was defending against.**

**The security hole.** The reference page renders components *live* — so the contact form inside one is a real form pointing at a real endpoint. Claude neutralised it with JavaScript, then "verified" it by driving a browser. It passed. Of course it passed — the browser had JavaScript enabled.

The server was still sending this:

```html
<form action="/real/endpoint/" method="post"> …
```

Scripts off, one click files a real record. The test confirmed the defence worked exactly as designed while completely missing that the design was wrong. I only found it because I asked a vague, nagging question: *"can you check if there's any loose end, any safety hazard, especially the forms ones?"*

The fix was to strip the `action` server-side so a submit goes nowhere:

```python
def defuse(html):
    soup = parse(html)
    for form in soup.find_all("form"):
        form.attrs.pop("action", None)     # submits to this page, which ignores it
    for link in soup.find_all("a"):
        link.attrs.pop("href", None)       # inert, but keeps its classes
    return mark_safe(str(soup))
```

**The cache in the wrong scope.** Claude's own plan said "cache the harvest per request." It implemented a module-level global — per *process*. So an editor's content change wouldn't appear until the server restarted. I found it by asking what I thought was a beginner question: *"what triggers this to appear? Do I need to reload something?"* The answer was "nothing" — which was wrong, and the question exposed it.

**Right by accident.** Claude's discovery logic filtered to page models, which happened to exclude a couple of config components. Correct output, wrong rule — put one of those on a page and it'd render garbage. The honest rule was "does it declare a template?"

**And a visible template comment**, from using a multi-line comment syntax that only works on one line. Third time in this project. It has a note about it. It did it anyway.

It was also slow — it spent twenty minutes fighting a test environment for what was a ten-minute template job, and killed its own dev server four separate times with the same command race.

## What We Actually Solved

My idea #3 became the whole architecture. Instead of declaring what a component should look like, **go and find where it's actually used:**

```
1. FETCH      a real instance of this component, in real page content  → use it
2. GAP-FILL   empty text / missing images inside it                    → synthesise
3. SYNTHESISE component used nowhere at all                            → build it whole
4. GIVE UP    show a "no preview" card — never hide it
```

On my project, **10 of 11 components resolved from real content** in about 31ms across 91 pages. Only the one used nowhere needed synthesising.

Why this beats declaring previews: there is nothing to keep in step. The page shows the site's own content, so it can't be subtly wrong. And the per-component config — the exact thing that could never be packaged — simply doesn't exist.

For the gaps, Claude built a generator that sizes text from the field:

```python
def sized_text(field_name, max_length):
    text = phrase_for(field_name)          # "This is a heading…"
    while len(text) < max_length * 0.8:    # fill ~80% of the real limit
        text += next_clause()
    return trim_on_word_boundary(text, max_length)
```

That detail matters more than it looks. A short "Lorem ipsum" **hides** the wrapping a design reference exists to show. Filling 80% of the actual `max_length` means a 200-character field looks different from an 80-character one — which is the entire point.

Step 4 is the one I'd fight for. A component with no preview still renders a card saying so. Silently skipping it would let the page claim full coverage while lying — which is precisely how the old page rotted.

## Key Lessons Learned

**Test the risk, not the mechanism.** Every real bug survived a passing test. The JS-only form defence passed because the browser had JS. The per-process cache passed because nothing checked across requests. The discovery filter passed because it gave the right answer for the wrong reason. Ask yourself: *what am I actually afraid of, and does this test reproduce that?* "It works as designed" is not the same as "the design is right."

**When a design needs a human to remember something, that's the bug.** Not a chore, not a documentation gap — a bug. The fix isn't a better reminder, a command, or a checkbox. It's removing the step. The registry was always the source of truth; we'd been maintaining a second one alongside it and hoping.

**Vague suspicion is a legitimate tool.** I didn't know there was a live form. I asked "any safety hazards, especially the forms?" because it *felt* unresolved. Two of the three real bugs came from questions like that, not from analysis. Trust the itch.

**Ask what triggers a thing, not just whether it works.** "Do I need to reload something?" sounds naive. It found a caching bug that would have shipped and confused an editor for weeks. The dumb question about *when* often beats the smart question about *what*.

**Build one before you package it.** I wanted a reusable package. The right move was building it once against a real project first — that's what surfaced the traps a package would have to handle. Designing the abstraction up front means guessing the seams. Extracting it after means knowing them.
