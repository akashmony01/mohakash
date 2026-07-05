---
title: 'Building with Claude: Certificates Are a Consequence, Not a Cause'
date: 2026-07-05
category: Building with Claude
excerpt: 'Getting a web app from "works on my laptop" to "live on the internet with HTTPS" is one of those tasks that looks like ten minutes and turns into an afternoon. Today I moved a Python web app onto a server that already hosts a dozen other sites, and I got bitten by two things that had nothing to do with each other: a shell-parsing bug in a secrets file, and a CDN error code that pointed me in exactly the wrong direction.'
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Getting a web app from "works on my laptop" to "live on the internet with HTTPS" is one of those tasks that looks like ten minutes and turns into an afternoon. Today I moved a Python web app onto a server that already hosts a dozen other sites, and I got bitten by two things that had nothing to do with each other: a shell-parsing bug in a secrets file, and a CDN error code that pointed me in exactly the wrong direction.

## The Problem We Were Solving

I had a working web application running locally and a server that already runs a reverse proxy in front of an app server, with a CDN sitting in front of that. The goal was to host the app in its own directory, keep everything the deployment needs *inside* the project (so it's version-controlled and reproducible), and have simple scripts: one to push the code from my machine, one to run migrations on the server when needed.

The important constraint I cared about: routine deploys should push code only. I did not want a normal deploy to accidentally overwrite the production database or uploaded files. I wanted that to be an explicit, opt-in choice, not the default.

This is a really common shape of problem. Anyone deploying an app-server-behind-a-proxy-behind-a-CDN eventually hits the same wall. The individual pieces are simple; it's the wiring between them — permissions, sockets, certificates, environment variables — where things quietly go wrong.

## What I Tried First (The Approach)

My instinct was to keep all the hosting artifacts self-contained in one folder in the project: the proxy config snippet, the service definition that keeps the app server alive, the push script, and a template for secrets. The server's global proxy config would just *import* the app's config snippet, so the two never got tangled.

The push script was the part I felt strongest about. Code-only by default, with explicit flags to include data:

```bash
./deploy.sh                 # code only — safe default
./deploy.sh --with-db       # opt-in: also push the database
./deploy.sh --with-media    # opt-in: also push uploads
./deploy.sh --all           # everything
```

The mental model was "guardrails first." A deploy you run twenty times a week should be incapable of destroying data you can't get back. You should have to *say* you want the dangerous thing. That reasoning held up perfectly — it's the one part of today I wouldn't change.

I also had a strong opinion that came up partway through: the deployment scripts should never automatically edit the server's *global* proxy config. That file is shared by every other site on the box. A script that appends lines to shared infrastructure can silently break something unrelated. I wanted to add that one line myself, by hand, and keep it manual.

## What I Got Wrong

Two assumptions, both small, both costly.

First: I added the import line to the global proxy config by hand — and then didn't reload the proxy. In my head, "edited the config" equalled "config is live." It isn't. A reverse proxy reads its config at start/reload time; an edit sitting on disk does nothing until you tell the process to re-read it. So the new site block was never actually active.

Second, and this is the one that really sent me down a rabbit hole: when I hit the site I got a generic CDN error saying the SSL handshake had failed. My gut said "the CDN is misconfigured." I spent mental energy blaming the layer I could see in the browser, when the actual failure was two layers down at the origin. The origin simply had no valid certificate yet — so of course the CDN couldn't complete a secure handshake with it. The error code was describing a *symptom* at the CDN, but the *cause* was back at my app.

## What Claude Got Wrong

Claude owns two genuine bugs today, and they're both instructive.

The first was in the secrets template. It wrote an environment file where one value contained spaces and angle brackets — something like a display name wrapped around an email address — and left it unquoted. That file gets read by a shell script (`source`d), and the shell choked on it immediately: syntax error. Fine, quote it. But then the *second* version failed too, and this is the subtle one: the auto-generated secret key contained a `$` character, and **`$` expands inside double quotes in a shell.** So even quoted, the shell tried to interpret part of the secret as a variable and crashed under strict mode. The real fix wasn't more quoting — it was generating the secret from a URL-safe alphabet with no shell metacharacters at all:

```bash
# fragile: value can contain $, (, ), which the shell interprets
SECRET="$(generate_key_with_symbols)"

# robust: url-safe alphabet only — nothing the shell cares about
SECRET="$(generate_urlsafe_token)"
```

The second mistake: Claude's setup script *automatically edited the shared global proxy config* — the exact thing I'd said I wanted to keep manual. It seemed helpful ("I'll wire it up for you") but it violated the safety principle that shared infrastructure shouldn't be mutated by a convenience script. To its credit, once I pushed back it rewrote the script to just *print* the line for me to add, rather than adding it. That's the right default.

None of these were catastrophic, but stacked together they turned a clean deploy into a debugging session — and the CDN error code made me suspicious of the wrong layer for longer than I'd like to admit.

## What We Actually Solved

Once we stopped theorizing and actually looked at the server, the real picture appeared in about thirty seconds. Two facts:

1. The app-server service was **not running** — the earlier setup had died on the broken secrets file, so migrations, static collection, and the service start had all never happened. No process meant no socket for the proxy to talk to.
2. Because the backend was unreachable and the site block wasn't live, the proxy had **never requested a certificate**. Proxies with automatic HTTPS only obtain a cert once the site is actually configured and serving.

So the chain was: broken secrets file → service never started → no socket → proxy has nothing to serve → proxy never gets a cert → CDN can't handshake → generic "SSL failed" in my browser. The error I saw was the *last* link in a five-link chain, and the fix was at the *first* link.

The actual fix was mundane: rewrite the secrets file with a shell-safe key, run the deploy step (install deps, migrate, collect static assets, restart the service), confirm the socket now existed, then reload the proxy. Within seconds of the reload, the proxy requested and received a certificate, and the public URL returned a normal response. No CDN settings were ever touched.

The thing that unblocked it wasn't a clever idea — it was *checking state instead of guessing*. Is the service active? Does the socket exist? Does a certificate exist on disk? Three yes/no questions answered the whole thing.

## Key Lessons Learned

**1. Certificates are a consequence, not a cause.** When automatic-HTTPS tooling "fails to get a cert," the cert is almost never the problem. The site block isn't live, or the backend is down, or DNS isn't resolving. Check whether the thing *behind* TLS is actually up before you touch anything TLS-related. This applies to any auto-cert setup, not just today's stack.

**2. A config edit is not a config reload.** Editing a file on disk changes nothing until the process re-reads it. Any time you hand-edit infrastructure config, the very next step is validate-and-reload. I lost real time to this obvious-in-hindsight gap.

**3. Any value a shell will read must be shell-safe *at generation time*.** Quoting is not enough — `$` and backticks expand even inside double quotes. If a file gets `source`d, generate its values from an alphabet the shell doesn't care about, and make the loader tolerant. Don't rely on quoting to save you from a character that shouldn't be there in the first place.

**4. Debug by observing state, not by theorizing about layers.** The browser showed a CDN error, so I reasoned about the CDN. The answer was three questions about the origin: process up? socket present? cert on disk? When you have access to the system, *look* — don't infer from the outermost symptom.

**5. Scripts that own shared infrastructure should advise, not mutate.** A one-line convenience isn't worth the blast radius of silently editing a config that other services depend on. Print the change and let a human apply it. Safe defaults matter most exactly where the shared surface is largest.
