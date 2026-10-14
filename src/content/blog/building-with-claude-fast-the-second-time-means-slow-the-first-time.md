---
title: 'Building with Claude: Fast the Second Time Means Slow the First Time'
date: 2026-10-14
category: Notes
excerpt: 'Today I worked on a performance problem every web developer meets sooner or later: a site that feels sluggish the first time you open a page and snappy every time after that. I went in thinking the codebase was too big and messy. I came out knowing the real cost was hidden in work the site did lazily, one visitor at a time, and that "tidy" and "fast" are two separate goals.'
featured: false
draft: false
hidden: false
cover: /uploads/Building with Claude_ A Faster Climb.png
resources: []
---

## Opening Hook

Today I worked on a performance problem every web developer meets sooner or later: a site that feels sluggish the first time you open a page and snappy every time after that. I went in thinking the codebase was too big and messy. I came out knowing the real cost was hidden in work the site did lazily, one visitor at a time, and that "tidy" and "fast" are two separate goals.

## The Problem We Were Solving

I had just put a small portfolio site live. It's built on a Python CMS (Django with Wagtail) and runs behind a reverse proxy on a modest server. It's a simple site: a wall of images on the home page, a grid of projects, a detail page for each project, plus an about page and a contact page. Nothing should make that slow.

But it was slow. The project detail pages were the worst, sometimes taking several seconds to appear. The odd part was that if I refreshed, or came back to the same page later, it loaded almost instantly.

This matters more than it sounds. On a portfolio, the first visit is usually the *only* visit. Someone clicks a link, waits three seconds staring at a blank screen, and leaves. "Fast once it's warmed up" means nothing to a visitor who never comes back.

## What I Tried First (The Approach)

My mental model was simple: slow site means too much code. I looked at the project folder and saw several apps (one for the home page, one for projects, one for generic pages, one for site-wide settings) plus a search app left over from the starter template. It felt heavy for such a small site.

So my request to Claude was roughly: check the whole site, find anything that makes it slower, and merge some apps together so it's cleaner and more lightweight.

In my head those were the same request. Fewer apps meant less to load, which meant faster pages. I'd also noticed the "second time is faster" pattern, and my vague theory was that "it does some cache stuff". I didn't connect that observation to the cause. I treated it as a side detail rather than the main clue.

## What I Got Wrong

I assumed that the number of apps and folders affects how fast pages load.

It doesn't, at least not in any way you could measure. Python imports each module once when the server process starts. After that, a request costs the same whether the models live in four apps or one. Project structure is about how easy the code is to read and maintain. It has nothing to do with response time.

I believed it because "bloated project, slow site" is an easy story. When something feels slow, the code you can *see* is the obvious suspect, and a project tree with lots of folders looks like bloat.

What changed my mind was the measurements. Before touching any structure, Claude profiled every page, timing each request and counting database queries. Every page except the home page rendered in about 20 to 40 milliseconds. That is not a slow site. So where were the seconds going?

The clue I had brushed aside, fast the second time, turned out to be the whole story.

## What Claude Got Wrong

To be fair to myself, the AI made the original mistake: Claude wrote the image templates that caused the slowness, in an earlier session.

Each image was requested in two formats (AVIF and WebP) at several widths, with a different width for the grid, the gallery, the home wall and the fullscreen viewer. The CMS creates those resized copies (it calls them "renditions") on demand, the first time a page asks for one. Locally it never showed up, because all the copies had already been made during development. On a fresh server, every first page view did the resizing live while the visitor waited.

Claude measured how much: about 0.3 to 0.7 seconds per copy for AVIF, a bit less for WebP. A project page with seven images needed fourteen copies, which works out to several seconds. The home page wall, with around forty images in four sizes each, could have taken over a minute on a cold start.

There were also a few smaller slips along the way:

- **Tests polluted real data.** The first time Claude ran the new test suite, it seeded demo images into my real media folder instead of a temporary one. Claude noticed, cleaned up the stray files and isolated the tests, but it should have isolated storage from the start.
- **A variable name leaked into the CSS.** Claude named something `card` in Python. The utility-CSS framework scans *all* source files for class names, so it saw "card" and bundled a whole unused component. Claude caught it by comparing the class list before and after the build.
- **A speed fix broke the deploy check.** Claude set the app server to load the app before starting to take requests, so the first visit after a restart wouldn't be slow. But that delays when the socket appears. The deploy script's health check ran instantly, found nothing listening yet and reported failure. When I ran the deploy, I got a scary error even though the site was fine. Claude had tested the setting locally but not how it changed the timing of everything around it.
- **Deleted folders wouldn't go away.** The sync tool excluded Python cache files, and excluded files protect their parent folders from deletion. So the old app folders stayed on the server, and the tool printed a wall of "cannot delete non-empty directory" warnings.

None of these did lasting harm, but each one cost me a moment of panic and a round trip.

## What We Actually Solved

Once I saw the numbers, I realized the fix wasn't about structure at all. It was about *when* the expensive work happens. The answer was to move image resizing from "when a visitor asks" to "when an editor uploads".

First, Claude cut the list of image sizes down to a short, fixed set in one place:

```python
# images.py
THUMB = "width-1000|format-webp"   # grids, galleries, home wall
FULL  = "width-2400|format-webp"   # fullscreen viewer
SHARE = "fill-1200x630|format-jpeg" # link previews

SPECS = [THUMB, FULL, SHARE]
```

Then every image gets its sizes made right after it's saved:

```python
def warm_uploaded_image(sender, instance, **kwargs):
    transaction.on_commit(lambda: instance.get_renditions(*SPECS))

post_save.connect(warm_uploaded_image, sender=ImageModel)
```

A small management command creates any missing sizes, and the deploy script runs it, so existing images are covered too. Dropping AVIF was a deliberate trade-off. The files are a little bigger, but WebP works everywhere, encodes faster and halves the number of copies.

The second fix was database queries. The home page made 206 queries because each image looked up its resized copies one by one. Claude switched to collecting all the image IDs first and loading them with their renditions in bulk:

```python
def with_renditions(ids, *specs):
    return (ImageModel.objects
            .filter(id__in=ids)
            .prefetch_renditions(*specs)
            .in_bulk())
```

That took the home page from 206 queries to 11, and the projects grid from 42 to 14.

There were a few smaller wins as well:
- Claude removed an external font import that nothing on the site actually used. It was blocking every first paint.
- The SQLite database now uses WAL mode, so reads don't wait on writes.
- A test now fails if visiting a page ever generates a new image copy.

And yes, we merged the apps too. Everything now lives in one app, the unused search and form-builder apps are gone, and a migration renames the database tables in place so existing content survives. It's genuinely cleaner. It just isn't why the site is faster.

## Key Lessons Learned

**1. "Fast the second time" is a diagnosis, not a detail.** If a repeat visit is fast and the first is slow, something expensive is being computed once and cached. I should have started there instead of filing it under "it does some cache stuff". The key question is: what does the first request do that the second doesn't?

**2. Measure before you restructure.** My gut said "too many apps". The profiler said 20 to 40 milliseconds. Without numbers I'd have merged everything, felt productive and still had a slow site. Structural cleanup is worth doing, but as its own goal, not as a performance fix.

**3. Test cold, not warm.** A dev machine is always warm: caches full, resized images already made. Production starts cold. Always ask what happens on a fresh database, a fresh cache and a freshly restarted server, because that's exactly what your first visitor gets.

**4. Every optimization moves a cost somewhere else.** Pre-generating images moved the cost to upload time, which was fine. Preloading the app moved it to startup, which silently broke an assumption in my deploy script. When you speed something up, ask what now happens earlier or later, and what else depended on the old timing.

**5. An AI collaborator is great at measuring. Make it measure.** Claude's best move today wasn't any single fix. It was refusing to accept my theory before profiling. Its worst moves came when it changed something without checking the side effects. I've learned to ask for both: show me the numbers, and tell me what this change might break.
