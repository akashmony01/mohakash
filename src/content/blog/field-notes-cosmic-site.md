---
title: "Field Notes: A Site That Feels Like the Sky"
date: 2026-06-09
category: "Notes"
excerpt: "A short walk through the visuals — with a cover image, an inline diagram, a downloadable note, and a few links worth keeping."
cover: /demo/cosmic-cover.svg
resources:
  - { label: "Demo notes", href: "/papers/demo-notes.pdf", kind: pdf }
  - { label: "Astro docs", href: "https://docs.astro.build", kind: link }
  - { label: "Source repo", href: "https://github.com/", kind: code }
---

This post exists to show how a write-up looks when it carries a little more than
text — an image at the top, a diagram in the middle, a file you can download,
and links out to the wider web.

## A picture in the middle

Images drop in with plain Markdown. Put the file in `public/` and reference it
by path:

![A simple orbital diagram, drawn by hand](/demo/orbit-diagram.svg)

They render rounded, framed, and centered automatically — captions come from the
alt text where it helps.

## Links, inline

Linking is ordinary Markdown too: here's [the Astro documentation](https://docs.astro.build)
and a [pretend project repo](https://github.com/). They pick up the sky-blue
accent and stay readable in the body.

## Files you can hand someone

For a PDF, a slide deck, or a dataset, add it to the post's `resources` — those
become the buttons up near the title. The **Demo notes** button above opens a
real (tiny) PDF, so you can see the whole path work end to end.

> Most broken things are just true things in the wrong order. A site is the same:
> get the structure right, and the decoration takes care of itself.

That's the whole idea — words first, then a few well-placed things to make them
land.
