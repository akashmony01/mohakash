---
title: 'Building with Claude: Verify at the Layer Your Users Actually Use'
date: 2026-07-05
category: Building with Claude
excerpt: 'I hit a bug this week that passed every test, cleared the linter, and got a confident "it works, verified" from my AI pair — and then did absolutely nothing when I clicked the button in my browser. That gap taught me more than any feature we shipped: *where* you check something matters as much as *whether* you check it. The backend can be flawless while the thing I actually touch is quietly broken.'
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

I hit a bug this week that passed every test, cleared the linter, and got a confident "it works, verified" from my AI pair — and then did absolutely nothing when I clicked the button in my browser. That gap taught me more than any feature we shipped: *where* you check something matters as much as *whether* you check it. The backend can be flawless while the thing I actually touch is quietly broken.

## The Problem We Were Solving

I was building a role-based workflow app from a written brief, with Claude doing most of the typing. Intake staff open records, area officers pick them up and work them, supervisors oversee a geographic hierarchy, and everyone gets notified at the right moments. At its heart it's a small state machine — an item moves *unclaimed → active → closed* — wrapped in access rules that roll *up* an org tree, so you see items in your patch and everything below it.

It's a very common shape: CRUD, plus a lifecycle, plus role-based permissions, plus notifications. No single piece is hard. The difficulty is that they interact, and the UI is stitched together from server-rendered pages with a little client-side interactivity sprinkled on top. That seam — between "the server did the right thing" and "my browser showed the right thing" — is where the whole lesson of the day lived.

## What I Tried First (The Approach)

My approach wasn't about the code; it was about how I ran the collaboration. I refused to let us start until there was a written plan in a file. I insisted we build in small phases, each ending at a checkpoint I'd sign off on. And I kept asking to be interviewed before anything got built — "give me the options, tell me the trade-offs, then I'll decide."

The reason was simple: I wanted to stay in control of the decisions and not waste effort. So I pushed constantly. "Why do we need a whole app just for seed data?" "Why are we depending on a CDN?" "Is this against the brief?" "Why are you adding changes directly — run them by me first." At the time it felt almost naggy. In hindsight that pressure was the single most valuable thing I brought to the project. Every time I made us pause to decide the *right* thing, the code came out leaner. Every time I let momentum win, we generated rework.

## What I Got Wrong

I got a few things wrong, and I want to be honest about them because they're the normal texture of building something.

I suggested simplifying the permission model so supervisors only oversaw one level of the hierarchy. It felt cleaner. But the brief explicitly said supervisors exist at *multiple* levels, so my "simplification" would have quietly broken a requirement. The right outcome was for the conflict to be surfaced, not for either version to be silently implemented.

I also misread a couple of signals. When a scheduled job printed "0 reminders sent," I assumed it was broken. It wasn't — that was de-duplication working exactly as designed, suppressing repeats within a window. And early on I almost let demo passwords sit in a shared README before the security smell registered and I moved them out.

None of these cost much, and that's the point. I flagged uncertainty instead of asserting it. "Is this against the brief?" and "don't be over-confident, check what's actually happening" turned out to be the two most useful sentences I said all day.

## What Claude Got Wrong

Here's the big one, and it's Claude's mistake, but I'll own that I had to force the issue.

I reported that clicking "claim" did nothing. Claude verified the feature with a command-line HTTP request, saw `HTTP 200` and the database row flip to *active*, and told me "claiming works, verified." Twice, confidently.

It did not work. The verification was worthless because **a command-line HTTP client doesn't run JavaScript.** The endpoint was fine. My *browser* was the broken layer — the interactive library wasn't firing on the click, or a repeated confirmation dialog was getting auto-dismissed after I'd clicked a few times. The scripted request sailed past all of that, hit the endpoint directly, and produced a comforting false positive.

This is a layer-mismatch error, and it's sneaky. Claude tested the HTTP boundary and generalized "the endpoint works" into "the user experience works." Those are different claims, and the space between them is exactly where interactive UI bugs live: event binding, dialog suppression, script load order, a console error two lines up that halts everything after it.

What frustrated me was the confidence. I had to push back hard — "don't be over-confident, I'm telling you it does nothing, go find out *why*" — before Claude stopped re-asserting and actually reasoned about what's different between a scripted call and a human in a browser. There were smaller versions of the same sloppiness too: a whole dependency pulled in for one line of logic, an extra page that just duplicated an existing filtered view, and a habit of clobbering the running server's own log file mid-test, which then broke the next check.

## What We Actually Solved

The fix, once the diagnosis was right, was almost embarrassingly small: stop making critical actions depend on JavaScript. A claim or a close is just a state change, and a plain HTML form does that in every browser, forever, with no client code:

```html
<form method="post" action="/items/42/claim/">
  {% csrf_token %}
  <button type="submit">Claim</button>
</form>
```

No fragile event handler, no dialog that can be suppressed, no silent failure. We kept the interactive library, but only as *enhancement* for things that genuinely benefit — live-filtering a table — always with a plain fallback that works on its own.

Then we turned it into a rule and reused it. Later I wanted a dropdown whose choices change based on another field. The reflex was "swap it client-side." This time we built it defensively: the dynamic swap is the nice-to-have, the field also renders a full usable list with no script at all, and the server validates the combination no matter what:

```python
def clean(self):
    data = super().clean()
    role, area = data.get("role"), data.get("area")
    if role == "FIELD" and (not area or area.level != "LOCAL"):
        self.add_error("area", "Field staff must be assigned a local area.")
    return data
```

If the JavaScript never runs, I still succeed and the data is still correct. If it runs, I get a smoother experience. That's real progressive enhancement instead of decoration pretending to be structure.

The same day I made us do a cleanup pass, and it drove home the mirror lesson. We deleted the redundant page, dropped the single-use dependency (one line reading a request header replaced it), and merged a helper that had been copy-pasted into two files. The whole system got smaller and easier to hold in my head — purely because I kept asking "do we actually need this?"

## Key Lessons Learned

**1. Verify at the layer where the failure happens.** A green test, a clean linter, and a `200 OK` can all coexist with a broken UI, because none of them touch the browser's event loop. If the complaint is "the button does nothing," reproducing it with a scripted request proves nothing — it skips the exact machinery under suspicion. If it's a click, verify with something that clicks.

**2. Never put a critical action behind JavaScript.** Anything that changes state should work as a plain server-rendered form. Use client-side interactivity for filtering, previews, and conditional reveals — never as the only path to a core action. The test: imagine the JS silently fails and ask "can the user still finish?" If not, you've built a trapdoor.

**3. Treat confident "verified" as a claim to audit, not a conclusion to accept.** My AI wasn't being arrogant; it accepted a proxy metric ("endpoint works") as the real one ("feature works") and stopped looking. As the human, my job was to notice the evidence didn't match the claim and refuse to move on. Pushing back isn't rudeness — it's part of the verification.

**4. Defend simplicity continuously.** Dependencies, extra pages, and clever abstractions accrete quietly, and each one is locally reasonable when it's added. A steady drumbeat of "why do we need this?" prevents debt instead of paying it down later. Building lean and building fast turned out to be the same thing.

**5. Surface conflicts with the brief; don't silently resolve them.** When my suggestion clashed with a written requirement, the right move wasn't to pick a side — it was to say "these disagree, here's the trade-off, you decide." The requirements are the arbiter, and any disagreement with them should be visible, not quietly patched over in code.

The through-line for me: the scariest bugs aren't the ones the tools catch — they're the ones the tools *can't see* because you're checking the wrong layer. Point your verification where you actually stand as a user, keep the critical path boringly robust, and treat "it works on my machine's `curl`" with all the suspicion it deserves.
