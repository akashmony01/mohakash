---
title: 'Building with Claude: 2026-06-23: Inspect Before You Mutate Shared Infrastructure'
date: 2026-06-23
category: Building with Claude
excerpt: "I set out to do something that sounded simple: deploy a web app onto a server I already owned. A few hours later I'd learned that the riskiest part of deployment isn't the app at all — it's the moment you touch configuration that other things quietly depend on. This is a story about breaking a bunch of unrelated sites, recovering them, and walking away with a much better mental model for working on shared infrastructure."
draft: false
hidden: false
cover: /uploads/a.png
resources: []
---

## Opening Hook

I set out to do something that sounded simple: deploy a web app onto a server I already owned. A few hours later I'd learned that the riskiest part of deployment isn't the app at all — it's the moment you touch configuration that other things quietly depend on. This is a story about breaking a bunch of unrelated sites, recovering them, and walking away with a much better mental model for working on shared infrastructure.

## The Problem We Were Solving

I had a multi-site application — one codebase serving two different public sites, routed by hostname — that needed to go onto a small VPS I rent. That VPS was not empty. It was already hosting roughly ten other things: a couple of app backends, some static sites, a generated blog, a PHP app. All of them sat behind a single reverse proxy with **one shared central config file**, and each app ran as its own background service.

So the real problem wasn't "how do I run my app." It was "how do I add my app to a busy, shared machine without disturbing the neighbours." That distinction turned out to be the whole ballgame, and I didn't appreciate it going in. I treated the task like I was setting up a fresh box. The box was anything but fresh.

## What I Tried First (The Approach)

My instinct was to keep everything tidy and self-contained. I wanted one project directory holding everything the deployment needed — config, scripts, the lot — so it would be easy to maintain and easy to reason about. That part was sound, and Claude and I built it out: a `deploy/` folder with the proxy config, the service definition, the app-server config, an env template, and a setup script.

The mental model I was running on was "my project, my config, drop it into place." The setup instructions reflected that. At one point they literally said: copy my proxy config file *over* the server's main config file.

```bash
# what the early instructions told me to do
cp deploy/Caddyfile /etc/caddy/Caddyfile
```

On a dedicated server, that's fine. On a shared one, that single line is a loaded gun. My config file only knew about *my* app. Overwriting the central file with it meant the server suddenly forgot every other site existed.

I also made a quieter assumption: that pushing my code up with a sync tool, or cloning the repo, would bring *everything* — including the database and uploaded files. It wouldn't. Those are deliberately excluded from version control, so they have to move separately. Small thing, but it's the same flavour of mistake: assuming the obvious-to-me defaults matched reality.

## What I Got Wrong

The core thing I got wrong was running a destructive command against shared state without understanding that state. When I pasted that `cp` (and later let a script append to and rewrite the central config), I genuinely believed I was only configuring *my* slice of the machine. I wasn't. I was stomping on a file that ten other sites read from.

I believed it because the framing in front of me said "this is your deployment, here's how you install it," and nothing in that framing flagged that the destination was communal. The perspective only changed when those other sites went dark and I went looking — and found that the central config no longer mentioned any of them. That's a horrible feeling, and it's a very avoidable one. The information I needed ("this file is shared, here's everything in it") was one read-only command away, and I never ran it before writing.

## What Claude Got Wrong

To be fair to myself, I was largely following guidance — and the guidance had the same blind spot I did. Claude authored deployment docs and a setup script that *overwrote and then auto-edited the central proxy config* before anyone had ever looked at that file. It assumed a dedicated proxy instance. It was a multi-tenant file.

That's the cardinal sin of infrastructure work: mutating shared state you haven't inspected. The right first move was a read-only survey — list the projects, dump the existing config, map domains to backends — *before* generating anything that writes. Instead we went straight to "here's your install."

Two smaller misfires came from the same impatience. First, the env file was loaded by having the shell *execute* it, which blew up the moment the randomly generated secret contained a parenthesis:

```bash
set -a; . deploy/.env; set +a   # bash tries to run the file; a "(" in the secret = syntax error
```

The app's own config layer could read that file safely; the shell only needed one variable exported. Second, a helper script broke when run from the "wrong" folder, because the language put the *script's* directory on its import path rather than the directory I was standing in. Both bugs are trivial in isolation. Together they meant we were playing whack-a-mole with symptoms instead of stepping back to look at the environment.

## What We Actually Solved

Once a few sites were down, the work split into two phases: recover, then redesign.

**Recovery** worked for one reason only: every edit to the central config had left a timestamped backup behind. So we could list the backups, inspect which one still contained the other sites, validate it, and reload. That single habit — back up before you touch, validate before you apply — was the difference between a scary afternoon and a catastrophe.

**Redesign** is where it got genuinely better, and most of the good ideas were about *shrinking the blast radius*:

1. **Survey first.** We ran a read-only inventory: every project folder, every site block, which port each backend listened on, which service owned it. Suddenly the machine was legible. (That survey also explained an earlier bug — my app couldn't start because another site already owned the port I'd picked. You can't see that without looking.)

2. **Stop touching the shared file with automation.** The deploy script was changed so it *never* edits the central config. Human-only, with a backup and a validate step, every time.

3. **Decentralize config via references, not copies.** Instead of pasting my site's config into the central file, the central file gets a single `import` line pointing at a config file that lives in my project. The same idea works for the background service: the unit file lives in the project, and the system holds only a symlink to it (created with a "link" command) rather than a copy. The app-server config never needed to be central at all — it's read by absolute path.

The end state: my project owns 100% of its server config inside its own `deploy/` folder, and the shared machine's footprint for my app is one import line and one symlink. Editing my routing can't fumble anyone else's site, because I'm not editing a file anyone else reads.

Finally, we generalized the whole thing into a reusable prompt (included below) so I can convert my other projects to the same pattern, one at a time, safely.

## Key Lessons Learned

**1. Inspect before you mutate — especially shared state.** Nearly every failure traced back to writing before reading. On any system that predates you, your first command should be read-only: what's here, who depends on it, what's it currently doing. A two-minute survey would have prevented the entire outage.

**2. Make every change reversible.** The only reason recovery was possible is that each edit left a backup. Bake this in: back up, change additively, validate, then apply. If you can't roll back in one command, you're not ready to run the change.

**3. Shrink the blast radius by design.** Prefer a reference (an `import`, a symlink) over a copy. Prefer per-component files over one big shared file. The goal is that any single change can only break the thing it's about — never its neighbours.

**4. Don't parse structured config through the shell.** Sourcing an env file means executing it; one stray character in a value detonates. Let the application read its own config, and give the shell only the minimum it needs.

**5. Validate, then reload — never reload blind.** Most reverse proxies and service managers have a "check this config without applying it" mode. Wiring that check in front of every apply turns a potential outage into a harmless error message. It's the cheapest insurance in ops.

The headline, though, is the first lesson. Treat shared infrastructure as something you *read first, change additively, and can always undo.* Get that reflex right and most of the other mistakes never get the chance to happen.

---

## Appendix: The Reusable Prompt

This is the generalized prompt I now paste into any other project to migrate it to the same self-contained pattern. It tells the assistant to investigate first, interview me when unsure, and treat the shared config as sacred.

```text
You are helping me refactor how THIS project is deployed on my shared VPS so that
all of its server configuration lives inside the project directory, and the central
server config only references it. Read this whole brief, then investigate this repo,
then interview me for anything you are unsure about before changing or running
anything.

THE SERVER (facts)
- A shared VPS. Projects live in /var/www/<project>/.
- Web server: a reverse proxy with ONE shared central config file that hosts ~10
  sites. This file is sacred — never overwrite or carelessly auto-edit it. Always
  back it up and validate before reloading.
- Process manager: systemd, units in /etc/systemd/system/.
- TLS is automatic. Apps sit behind the proxy on 127.0.0.1:<port>.

THE TARGET PATTERN (what "done" looks like)
- Proxy site block  -> deploy/<project>.conf in the project; central file gets ONE
  line: import /var/www/<project>/deploy/<project>.conf
- systemd unit (apps only) -> deploy/<project>.service in the project; central holds
  only a SYMLINK created with `systemctl link`.
- app-server config (gunicorn/uvicorn/etc.) -> in deploy/; referenced by absolute
  path, no central footprint.
- secrets/env (apps only) -> deploy/.env, gitignored.

PROJECT TYPES YOU MAY FIND (handle accordingly)
- Python/Django app -> served by gunicorn/uvicorn on a port or unix socket. Needs a
  proxy block (reverse_proxy + static/media handling), a systemd unit, and its
  app-server config in deploy/.
- Static site generator (Pelican/Hugo/etc.) -> built to an output dir; the proxy
  just serves it (root + file_server). NO systemd service. The build is a separate
  step — don't run it as a service.
- Plain static -> root + file_server. No service.
- PHP -> php_fastcgi to the shared fpm socket + file_server. No per-project service.
- Node/other long-running app -> reverse_proxy to its port, plus a systemd unit if
  it isn't already managed.

PORTS
- Several ports are already taken by other apps. CONFIRM a free port on the server
  with `ss -ltnp` before assigning one. Never guess.

WHAT I WANT YOU TO DO, IN ORDER
1. Investigate this repo and the live setup. Change nothing yet. Detect the
   framework/type. Find its current proxy block, its systemd unit (if any), and the
   port/socket it listens on. Summarize as a short table.
2. Interview me for anything unclear: exact domain(s); app vs static; which
   port/socket; which build-output directory; any special needs (large uploads,
   websockets, auth, headers).
3. Create the project-local files in deploy/: the proxy site block, and for apps the
   systemd unit (absolute paths) plus app-server config. Keep secrets out of git.
4. Give me a safe, step-by-step server migration I run as root:
   - Back up the central config first (timestamped copy).
   - Get the project files onto the server so the import target exists FIRST.
   - Replace this project's inline block in the central file with ONE import line.
     Leave every other project untouched. Prefer reading the whole file and
     rewriting it verbatim minus this one block.
   - ALWAYS validate the config; only reload if it passes; restore the backup if not.
   - For apps: `systemctl link` the unit, daemon-reload, enable, restart; confirm the
     unit is a symlink and the service is active.
   - Verify with curl that THIS site and a couple of OTHERS still return 200, before
     and after.
   - Delete nothing until the new setup is confirmed working.
5. Confirm the end state and that every site still serves 200.

GROUND RULES
- Never overwrite or blindly rewrite the central proxy config. Back up + validate.
- Never assume a port is free — check with ss -ltnp.
- Don't invent a systemd service for a static/generated site.
- When in doubt about domains, ports, directories, or how something is built/run,
  STOP and ask me.
- Keep secrets out of git.

Start with step 1 (investigate) and show me what you find.
```
