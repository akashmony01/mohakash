---
title: "Building with Claude: Code Travels in Git, Config Doesn't"
date: 2026-06-22
category: Notes
excerpt: Today I set out to do one thing — add a campaign landing page to my existing Wagtail project and get it live — and ended up learning more about deployment hygiene than I have in months. The build itself was the easy part. The deploy is where I nearly took down a live site, twice. Here's the honest version.
draft: false
hidden: false
cover: ''
resources: []
---

Today I set out to do one thing — add a new landing page to an existing Django/Wagtail project and get it live — and ended up learning more about deployment hygiene than I have in months. The build itself was the easy part. The deploy is where I nearly took down a live site, twice. Here's the honest version.

## The build went suspiciously well

I wanted a self-contained landing page added to a larger Wagtail project as its own *site* — same Django process, routed by hostname, with its own theme so it wouldn't inherit the main site's look.

The smart moves Claude suggested early paid off later. We compiled Tailwind locally instead of leaning on the CDN, and **namespaced every new design token** so it couldn't collide with the existing theme:

```js
// tailwind.config.js — a project-specific prefix keeps these isolated
'lp-accent': '#e8641c',
'lp-bg':     '#0d0d0d',
fontFamily: { lp: ['CustomFont', 'ui-sans-serif', 'system-ui'] },
```

Then we broke every section into editable StreamField blocks with show/hide toggles and a layout switch. One genuinely nice fix came out of my own feedback: sections were doubling their spacing when a background was on. The rule we landed on — *padding when there's a background, margin when there isn't* — is the kind of thing that looks obvious only after someone says it out loud:

```django
<section class="{% if value.light_background %}bg-lp-panel py-20 sm:py-28{% else %}my-20 sm:my-28{% endif %}">
```

Small embarrassing bug: Claude left a **multi-line Django comment** (`{# ... #}`), which only works on one line, so the comment text rendered live on the page. I spotted it and went "is that supposed to be there?" Lesson filed.

## Where I assumed wrong

Two things bit me, both my own doing.

First, **I committed the new work to the wrong branch.** I created a feature branch, then somehow added the changes to my current branch and tried to push before catching it. Claude untangled it by moving branch *pointers* instead of doing a destructive reset — which I appreciated, because my instinct would've been `git reset --hard` and a prayer.

Second, and bigger: when it came time to think about hosting on the real domain, I asked "can't I just point the server at my feature branch and pull?" I assumed my branches were interchangeable. They were not. My production branch reads secrets from a `.env` via `python-decouple`; the feature branch had a stub `production.py` with no `SECRET_KEY` and no `ALLOWED_HOSTS`. Switching branches would have started Django with no secret key — instant crash.

## Where Claude assumed wrong

I'm not letting the AI off the hook either. The deploy guide started with a confident, whole-tree `rsync` — *before* anyone checked what the server actually was. It turned out the server is a git checkout of a *different* branch, with its own templates and `.env`-based settings. The rsync quietly overwrote production settings and templates on disk. The **only** reason the main site didn't go down is that the app server was still running the old config in memory and hadn't reloaded yet.

We caught it because the diagnostics showed the truth:

```
 M project/settings/production.py     ← real prod settings, clobbered
 M project/templates/base.html
```

Recovery was a one-liner that restored everything from git's index without nuking my untracked new app:

```bash
git checkout -- .        # restores from the index, keeps untracked work in place
```

There was a second landmine too: a migration had been pinned to *my dev machine's* framework version, which was newer than the server's:

```python
# was a recent migration that doesn't exist on the server's older version
('wagtailcore', '0001_initial'),
```

## The thing that saved us

The single best decision was making the page content reproducible with a **management command** instead of copying my dev database to the server (which would've clobbered the live site's data). One idempotent command rebuilds the page, imports its images, populates every block, and registers the site mapping:

```bash
python manage.py setup_landing_page --hostname landing.example.com
```

Run it anywhere — staging today, the real production domain tomorrow — and the content just *appears*. That's the difference between a deploy you can repeat and one you pray you never have to redo.

By the end: both sites returning `HTTP/2 200`, static assets served correctly, the main site untouched, and — crucially — all the code committed to git so nothing lives only on the server.

## Key Lessons Learned

**1. Inspect the environment before you write a single deploy command.**
"Where's the project, what branch, what settings module, what database?" should come *before* the rsync, not after it breaks something. My server wasn't a plain folder — it was a git checkout of a different branch with `.env`-based config. Five minutes of `cat`-ing files would've saved an hour of recovery. Claude led with confidence instead of with questions, and I went along with it. Both of us own that one.

**2. Code travels in git; data and config don't — so make them reproducible.**
Everything in the new app (templates, blocks, fonts, images, the setup command) lives in version control and rides along to any branch. The database content, the `.env`, the web-server config, and the DNS are *per-environment* and get rebuilt, not copied. A management command for the data beats rsync-ing a database file every single time. If you can't recreate your app's state from git + one command, you don't have a deploy, you have a hostage situation.

**3. Never rsync a whole tree onto a git-managed server on a different branch.**
That's how you silently overwrite production settings. Deploy *additively* — sync only the new app folder, or better, commit the feature onto the branch the server actually tracks and `git pull`. My new feature was essentially a folder plus one line in `INSTALLED_APPS`; there was never a reason to touch the rest of the tree.

**4. Migrations and settings are version-specific — don't assume parity.**
A migration generated on a newer framework version pinned a dependency that didn't exist on the server's older one. Pinning to the initial migration made it portable. Same idea with management commands defaulting to dev settings: every server command needs the production settings module set explicitly, or it quietly hits the wrong database.

The site's live, the main site survived, and next time I'll ask "what is this server, exactly?" before I trust any one-liner — mine or the AI's.
