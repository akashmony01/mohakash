---
title: 'Building with Claude, 2026-08-23: One Codebase, Two Sites, and the Boundary That Made It Work'
date: 2026-08-23
category: Building with Claude
excerpt: "Today I set out to do something that sounded trivial and turned out to be quietly deep: run a second, independent copy of an app I'd already deployed, on the same server, under a new domain. Along the way I wired up a transactional email provider, and — completely unexpectedly — spent twenty minutes discovering that my machine had no working IPv6. None of it was hard once I understood it. All of it was confusing until I did."
featured: false
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Today I set out to do something that sounded trivial and turned out to be quietly deep: run a second, independent copy of an app I'd already deployed, on the same server, under a new domain. Along the way I wired up a transactional email provider, and — completely unexpectedly — spent twenty minutes discovering that my machine had no working IPv6. None of it was hard once I understood it. All of it was confusing until I did.

## The Problem I Was Solving

The core problem was *multi-instance deployment*: I had one app live and healthy, and I wanted a second instance of the exact same code serving a different domain, with its own data, so I could use it for testing without touching the real thing. Wrapped around that were two smaller problems — connecting an email service so the app could actually send mail, and getting the new domain's certificate to work behind my CDN.

It matters because this is the shape of a hundred real situations: staging alongside production, a demo site next to the live one, the same product for two customers. If you get the architecture right, adding a site is boring. If you get it wrong, the two instances fight over the same files and you're debugging ghosts.

## What I Tried First (The Approach)

My first mental model was simple and, it turned out, wrong in an instructive way. I had two deployment scripts sitting in my project: an older shell-and-`rsync` one, and a newer git-based one. So I assumed the natural split was *one tool per site* — keep using the shell script for the existing site, and point the git tool at the new one.

I also wondered whether the new site should live on its own git branch, to "keep things separated." That felt tidy. In my head, separation meant a separate branch.

And when it came to seeding the new site with data, I figured I'd just push my local database up with the git-based tool, the same way the code went up:

```bash
# what I imagined would work
deploy --to new-site   # ...and the database comes along too, right?
```

## What I Got Wrong

Almost every one of those assumptions was off.

First, I assumed the *tool* decided *which site* got deployed. It doesn't. Both of my scripts were hardcoded to the same folder and the same service — so "using the other tool" would have just deployed on top of my existing site, not created a new one. The tool and the target are independent things; I'd conflated them.

Second, the branch idea. I believed a separate branch would isolate the two sites. But the code was *identical* for both — the only differences were configuration. A branch would have meant constantly merging my main line into it just to keep the second site current. That's not separation, that's a maintenance tax. The real separation lives somewhere else entirely.

Third — and this one I actually *did* while not paying attention — I pasted a real secret straight into a template file that was tracked in version control. Not the private, server-only config file. The committed template. It's the single easiest way to leak a credential, and I walked right into it because the two files look nearly the same.

Fourth, I assumed the git-based deploy could carry the database. It can't, and the reason is the whole point: the database is deliberately *ignored* by version control, so git never sees it and never moves it.

## What Claude Got Wrong

Claude wasn't a clean oracle here, and I want to be honest about that because the mistakes were part of the journey.

When we set up email, Claude filled the config template with a guessed username, assuming it followed the common convention for that provider. The provider had actually generated a different login. So the template was wrong until I copied the real value from the dashboard and corrected it. A guessed default presented as fact is worse than an obvious blank.

Claude also initially assumed my live site was deployed one way, when inspection later showed it was deployed the other way. It only got the right answer by actually logging into the server and *looking* — reading the git config, checking the remote — rather than trusting its first story.

And when my email domain wouldn't verify, Claude started guessing at DNS record names one at a time instead of just asking me to paste the exact record from the dashboard first. It found the answer, but slower than necessary. There was even a moment where a sloppy one-liner printed a false "you have unpushed commits" warning and made it look, for a heart-stopping second, like a commit had vanished. It hadn't — the command was just wrong.

The pattern in Claude's misses is the same as the pattern in mine: reasoning about how things *should* be, instead of checking how they *are*.

## What We Actually Solved

The reframe that unlocked everything was this: **the code is shared; everything environment-specific is not.** One branch, one repository. But each site gets its own folder, its own database, its own secrets file, and its own service with its own socket. I started thinking of it as "same recipe, two kitchens." The recipe (code) is shared from one place. Each kitchen (server folder) cooks its own meal (data) with its own ingredients (secrets).

Concretely, standing up the second site meant adding a small, isolated set of config files — a service definition pointing at a new folder and a new socket, a web-server block for the new domain, and a fresh secrets template — without editing a single file the first site depended on. The two instances share the codebase and nothing else.

The email integration was almost anticlimactic once I saw it the same way: the app already read every mail setting from the environment, so there was *no code to change*. The new site just needed its own secrets file with its own credentials. Same code, different environment.

The database seeding became a separate, honest step: because data is git-ignored, I copied the file up directly with `rsync`, exactly once, rather than pretending git could do it.

```bash
# code travels by git
git push            # laptop -> hosting
# ...then on the server:
git pull            # hosting -> server folder

# data travels by file copy (git will never move it)
rsync db-file server:/path/to/second-site/
```

And the IPv6 mystery — the login page that wouldn't load — resolved the moment we stopped theorizing. One command reached the host fine; another, forced over IPv6, failed instantly. My machine had no IPv6 route at all, but its DNS still handed browsers IPv6 addresses to try. Disabling IPv6 fixed it in seconds. The login page was just the first modern, IPv6-first site to expose a gap that had been there the whole time.

## Key Lessons Learned

**Verify state before theorizing about it.** Nearly every real step forward today came from *looking* — reading a config, running a DNS query, checking file ownership — not from reasoning about how things ought to behave. The IPv6 bug is the cleanest example: it masqueraded as a browser or account problem, and a single command settled it. When something's confusing, my first move now is to observe, not to hypothesize.

**Know your shared-vs-per-instance boundary.** This is the architectural heart of running more than one instance. Code and templates are shared; secrets, data, sockets, and service names are per-instance. Draw that line explicitly and two sites coexist effortlessly. Blur it and they collide over the same files. Most "multi-tenant" pain is really just a smudged boundary.

**A tool and its target are different things.** I wasted thinking on "which tool for which site" when the real question was "which target." Deployment mechanisms don't inherently know where they point; that's configuration, and it's on you to make it explicit.

**Templates hold placeholders; only the real, ignored file holds secrets.** The near-identical look of a committed template and a private config file is a trap. The safe habit is boringly rigid: real credentials only ever go in the file that version control cannot see.

**Git moves code, not data.** Anything you deliberately keep out of version control — databases, uploads — will never ride along on a pull. That's a feature, not a gap, and it means data movement is always its own conscious step.

The meta-lesson tying it together: adding a second site *should* be boring, and when it isn't, it's because some boundary is fuzzy or some assumption went unchecked. Make the boundaries explicit, check the actual state, and the boring outcome is the one you get.
