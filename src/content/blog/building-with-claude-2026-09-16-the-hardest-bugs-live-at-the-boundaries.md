---
title: 'Building with Claude, 2026-09-16: The hardest bugs live at the boundaries'
date: 2026-09-16
category: Building with Claude
excerpt: 'Today I took a feature that had grown up *inside* one of my web projects — a newsletter system — and turned it into a standalone, installable plugin that any similar site could drop in. It sounded like a copy-paste-and-rename job. It was not. Almost every real problem I hit lived at the seams: where my code met a third-party package, where the plugin met the host project, and where one framework version disagreed with another.'
featured: false
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Today I took a feature that had grown up *inside* one of my web projects — a newsletter system — and turned it into a standalone, installable plugin that any similar site could drop in. It sounded like a copy-paste-and-rename job. It was not. Almost every real problem I hit lived at the seams: where my code met a third-party package, where the plugin met the host project, and where one framework version disagreed with another.

## The Problem I Was Solving

I had a newsletter app living inside a larger site. It worked, but it was welded to that one project — it imported the host's models, assumed the host's settings, and couldn't be reused anywhere else. I wanted to extract it into a proper package: `pip install`, add a settings block, and it just works on any comparable site.

This matters because "works in one project" and "works as a library" are completely different bars. A library can't assume anything about its host. It has to bring its own configuration, its own defaults, its own database migrations, and it has to survive being installed next to code it has never seen, on framework versions I didn't test against. The whole job is really about *boundaries*: drawing clean ones and defending them.

There was an extra twist. My plugin didn't stand alone — it was built *on top of* a base package (the thing that actually stored subscribers and handled confirmations). So I wasn't just extracting my code; I was wrapping someone else's, and inheriting all of its assumptions too.

## What I Tried First (The Approach)

My first instinct, which I still think was correct, was **copy and clean, not move**. I told Claude to leave the original app completely untouched and build the new package fresh alongside it. That gave me a safe reference to compare against, and it meant any mistake during extraction couldn't take down the running product.

My mental model was simple: strip out the host imports, rename everything to the new namespace, wire up a settings dict, and ship it. Configuration would flow through one place:

```python
def get_setting(name):
    configured = getattr(settings, "PLUGIN_CONFIG", {}) or {}
    return configured.get(name, DEFAULTS[name])
```

I also pushed hard on simplicity at the setup seams. When I saw the install instructions asking me to add five apps to my settings and three URL includes, I pushed back: "Why can't the plugin just register its own stuff? Why do I need all this?" That instinct was healthy — it led to real ergonomics later (a one-line helper to add the apps, a single bundled URL include, and startup checks that fail loudly when a required setting is missing).

## What I Got Wrong

My biggest wrong assumption was believing **my plugin's settings controlled everything about its behavior.** They didn't. A huge amount of behavior came from the *base package* underneath, and it had its own machinery I hadn't mapped. The confirmation email's link domain came from a "sites" record, not my base-URL setting. Whether that link was `http` or `https` came from a flag on the base package that defaulted to `https` — so on my local machine every confirmation link came out as `https://localhost`, which no browser could open. I spent time convinced the plugin was broken when the plugin was fine; I just didn't understand what the base package was doing on its own.

I also made a classic integration mess. I had old code from a previous email-provider integration, and I mashed it into the new plugin's submission hook without thinking:

```python
# what I did — and why it broke
success = old_integration(data['first_name'], data['last_name'])
submission = super().process_form_submission(form)
return self.get_submission_class().objects.create(...)   # creates a SECOND record
```

Two bugs in four lines. `data['first_name']` threw a `KeyError` because my form had no such field, and I created the submission twice — once via `super()` and again by hand. I believed it because that code *used* to work in a different context. What changed my perspective was seeing that the plugin and the host each own their own flow, and I was clumsily stepping on both.

## What Claude Got Wrong

Claude made its share of mistakes, and some of them cost me time. The one that stung most: Claude generated a database migration on the **newer** framework version I happened to be running. That migration used a serialization format the **older** version literally couldn't parse. So it passed for Claude and then blew up the moment I installed the plugin into a project on the older version. Claude's approach *looked* fine — the tests were green — but "green on one version" hid a whole class of breakage. The fix became a rule: generate schema migrations on the *lowest* version you support.

Claude also did a blanket find-and-replace during the rename that mangled a constant — a variable got a function call spliced into the middle of its name. And it wrote a setup guide using a secrets helper my project didn't have, so when I followed Claude's *own* instructions I hit a `NameError`. Then there was the "safe mode" that logged its output at a level nothing displays by default, so it looked like nothing happened when it was quietly working. Each of these was plausible in isolation, and each one derailed me for a bit because the failure didn't point at the real cause.

## What We Actually Solved

The real breakthrough wasn't a single fix — it was reframing the whole thing around **boundaries**.

First, decoupling from the host: instead of importing the host's models, the plugin reads attributes defensively, or offers an abstract base class the host opts into. So integration became duck-typed, not import-coupled:

```python
if getattr(field, "use_for_grouping", False) and field.field_type in CHOICE_TYPES:
    apply_group(field)
```

Second, taming the base package: rather than fighting its email machinery, I routed its side-effects through one explicit mode switch I controlled — a single `DELIVERY` setting with modes like "log only", "print", "local inbox", and "real send". Once even the base package's confirmation email flowed through that switch, dev, staging, and production all behaved predictably.

Third, cross-version safety: run the test suite on *every* supported version in separate virtualenvs, generate migrations on the oldest one, and loosen the version pins to a bounded range instead of nailing them to the exact versions on my machine.

And finally, setup ergonomics that turned my earlier complaints into features: a `with_required_apps()` helper so the host adds one line instead of five, a bundled URL include, and startup checks that turn silent runtime breakage into a clear message at boot. The confirmation-link problem was solved not with code but with understanding — set the site record and flip the base package's `https` flag off for local dev.

## Key Lessons Learned

**1. A plugin's hardest problems live at its boundaries, not its logic.** The domain code ported in minutes. Every genuine bug was at a seam — the base package's hidden behavior, the host's settings, a version mismatch, a migration format. I learned to spend my attention on the edges, because that's where reuse actually breaks.

**2. "Works on my machine" is the start of testing, not the end.** The migration disaster happened precisely because everything looked green on one version. Now I treat multi-version, multi-host verification as mandatory, not optional — anything that touches schemas or framework APIs gets run on the lowest supported version too.

**3. Map the machinery you're wrapping before you trust your own settings.** I assumed my config controlled behavior it never touched. The lesson: when you build on a base package, explicitly trace where *it* gets its URLs, protocols, sender addresses, and side-effects — and decide, per mechanism, whether to respect it or route it through your own switch.

**4. Give visible feedback for "did nothing real" paths.** A safe/dry-run mode that only logs quietly reads as broken. If an action deliberately does nothing external, it should *say so* where the user is actually looking.

**5. Defend boundaries with discipline, not willpower.** Grep host imports down to zero. Integrate via abstract bases or attribute-reads, never imports. Back up host files before editing them, and do a clean-slate reinstall drill to prove your own install guide works. The discipline is boring; it's also what makes something genuinely reusable.
