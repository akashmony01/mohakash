---
title: "Building with Claude, Day 1: What We Got Wrong"
date: 2026-06-08
category: "Building with Claude"
excerpt: "Starting a daily habit of asking Claude what we each got wrong today — and writing down what we learned fixing it."
---

I'm starting a small daily ritual: at the end of a working session with Claude,
I ask four questions —

1. What did *we* build today?
2. What did *I* get wrong?
3. What did *Claude* get wrong?
4. What problem did we actually solve, and how?

Then I turn the honest answer into a post. Here's the first.

## What we built

The very site you're reading. A night-sky personal home — projects, poetry,
research, and this blog — in Astro, Tailwind, and a little Alpine.

## What I got wrong

I wanted the sections as subdomains because they "looked cooler." They didn't
look cooler; they would have split my SEO and tripled my maintenance. Naming a
thing well beats decorating it.

## What Claude got wrong

It reached for an Alpine plugin (`x-collapse`) that wasn't installed, and used
`x-cloak` before adding the CSS that makes it work. Small, but the kind of thing
that silently breaks a menu.

## What we solved

A clear architecture: subdirectories, one repo, one voice. The lesson that keeps
recurring — *most broken things are just true things in the wrong order.*
