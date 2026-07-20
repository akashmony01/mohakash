---
title: 'Building with Claude: Email Is Not the Web, and Config Is Not Truth'
date: 2026-07-20
category: Building with Claude
excerpt: 'Today I built a newsletter system from scratch — subscriber management, double opt-in, provider integration, and a drag-and-drop email composer — and almost every hour of debugging came down to two lessons I had to learn the hard way. The first: configuration is not truth, only the running system is. The second: email is not the web, no matter how much the HTML looks like it.'
featured: false
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Today I built a newsletter system from scratch — subscriber management, double opt-in, provider integration, and a drag-and-drop email composer — and almost every hour of debugging came down to two lessons I had to learn the hard way. The first: configuration is not truth, only the running system is. The second: email is not the web, no matter how much the HTML looks like it.

## The Problem I Was Solving

I needed a CMS to do two things that sound related but really aren't.

**One:** collect subscribers, confirm them properly, and reliably deliver an email to all of them through a transactional email provider. That's a systems-integration problem — env vars, DNS, API regions, database state.

**Two:** let a non-technical editor *build* that email visually — blocks with headings, images, two-column layouts, gradient backgrounds, buttons — and have it survive contact with real inboxes. That's a rendering problem, and the target renders like it's 1999.

I treated these as one project for too long. They're not. Different failure modes, different debugging instincts.

## What I Tried First (The Approach)

### Phase 1: the plumbing

My starting brief prescribed a stack: a CMS-integrated newsletter package for authoring, a separate subscriber library for opt-in and unsubscribe, an ESP adapter for delivery, and MJML for email-safe HTML. Four packages, each well-scoped. I liked it — I did not want to hand-roll double opt-in, and I certainly didn't want to hand-roll unsubscribe compliance.

The CMS-newsletter package wanted me to implement a "campaign backend," so Claude and I wrote one: a campaign model, a recipient-list model, a management command to drain a send queue, optional background-worker support.

```python
class LocalCampaignBackend(CampaignBackend):
    def save_campaign(self, *, name, subject, html, recipients, ...): ...
    def send_campaign(self, campaign_id): ...
    def schedule_campaign(self, campaign_id, when): ...
```

### Phase 2: the composer

For the body, my instinct was DRY: *reuse the site's existing content blocks.* We already had a mature block library — heading blocks, image blocks, CTA blocks. Why build a second set?

I also had strong opinions about the layout. For a two-column image-and-text section, I said: make the image a background with `cover` sizing so it fills the column at full height. On the web that's a one-liner.

## What I Got Wrong

**I trusted the brief's package list past the point where it was helping.** The CMS-newsletter package assumed campaigns, scheduling, and externally-managed recipient lists. My actual requirement was *"write an email, send it to everyone who confirmed."* What I got instead was a publicly-visible page type nobody wanted, an empty recipient chooser, and a "schedule campaign" concept I never asked for. Its API had also drifted from its docs — renamed kwargs, abstract methods that no longer existed on the base class.

I kept asking for patches. Five of them. I was treating API drift as the problem when the real signal was: *this dependency's model of the world doesn't match mine.*

**I assumed reusing web blocks would work.** They'd have looked flawless in the CMS preview — which is a browser — and shattered in most inboxes. Utility-class CSS, flexbox, and external stylesheets get stripped or ignored by mail clients. The preview would have lied to me convincingly.

**I assumed "cover image" was simple.** In the MJML column primitive there is no background-image attribute at all. My "simpler" suggestion was not merely harder — it was impossible as stated.

**I tested sends from my local machine.** Obvious in hindsight. Every image URL in those emails was `http://localhost:8000/media/...` — pointing at each recipient's own computer.

**I asked to remove the automatic fallback footer.** I wanted clean control over the layout. Claude flagged the deliverability risk and I brushed past it. A newsletter with no visible unsubscribe link is a spam-complaint magnet, even with the compliance header set.

## What Claude Got Wrong

Claude's mistakes had one shape: **it reasoned about what the code *should* do instead of checking what it *did*.**

When emails weren't sending, Claude told me to set the email backend in my env file. Confident, specific, and useless — because the dev settings module hardcoded it:

```python
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # env silently ignored
```

Claude recommended a fix without reading the code path the fix depended on. I burned time thinking my env file was broken.

The gradient bug was worse. Claude implemented section backgrounds as a class plus a rule in `<head>`:

```html
<head><style>.bg1 { background-image: linear-gradient(...) !important }</style></head>
<div class="bg1" style="background:#solid">…</div>
```

Valid CSS. Completely correct in a browser. But many mail clients strip `<style>` entirely, so I only ever saw the flat fallback colour. The infuriating part: Claude had already tested the inline version, seen it work, and then chosen the head-style version anyway to get a nicer fallback in one minority client — optimising against the majority of my actual readers.

Same disease in the admin UI. I said the select fields weren't full width. Claude wrote `select { width: 100% }`. Still not full width. Claude added `!important`. Still not full width. Only on the third round did it grep the framework's own stylesheet and find the real cause in one line:

```css
.w-field--select { display: inline-block }  /* the wrapper collapsed to content */
```

The select was always 100% — of a wrapper that had shrunk. Two rounds lost to assuming instead of looking. Then it repeated the exact same mistake on the image chooser before generalising the fix.

Claude also shipped a custom colour-picker widget that crashed the block editor entirely, because the CMS renders StreamField widgets **client-side** through a serialisation layer where a server-side `render()` override never runs.

## What We Actually Solved

**I killed the CMS-newsletter package.** The whole thing. I rebuilt the composer as a plain CMS snippet with synchronous sending — save it, hit send, done. The rewrite took a fraction of the time the patching had, and every confusing concept disappeared with it. I kept the pieces that were genuinely pulling weight: the subscriber library for opt-in state, the ESP adapter for delivery, MJML for compilation.

**I stopped trusting configuration and made the code self-correcting.** Two of my worst bugs were config drift: the sender address lived on a *database row* seeded with a placeholder that wasn't on my verified domain (so the provider silently dropped every confirmation email), and the subscriber list wasn't linked to the current site (so the library's own per-site manager couldn't find it, and confirmation links 404'd). The fix was one idea:

```python
def get_default_list():
    obj = List.objects.filter(slug=SLUG).first()
    if obj:
        sync_sender_identity(obj)     # From address always matches settings
        ensure_linked_to_site(obj)    # always visible to the library's views
    return obj
```

That retired two entire classes of bug permanently.

**I started inspecting real artifacts.** A production send failed with a 404 from the provider — cause: a **trailing space** in an env value, found instantly by printing `repr()` instead of the value. "Emails aren't arriving" — I pulled the provider's event log and saw `250 OK` from the recipient's mail server; they were in a promotions tab all along. "Images aren't showing" — I pulled the actual sent message from the provider's API and read the `src` attribute. `localhost`. One step, no theorising.

**I built email-specific blocks instead of reusing web ones.** Six blocks — header, content, two-column, image, spacer, footer — each rendering an MJML fragment. Gradients went inline, where nothing can strip them:

```html
<div style="background:#solidFallback; background:linear-gradient(to right, #a, #b)">
```

The two-column section became a hand-built table, because a `<td>` background always fills its entire cell — which is exactly the full-height cover effect I wanted, and the column primitive couldn't give me. And to get the image on top on mobile regardless of its desktop side, the image cell is **always first in the source**, with `direction: rtl` on the table flipping the visual order on desktop:

```html
<table style="table-layout:fixed; direction:rtl">   <!-- reverses cell order -->
  <td style="direction:ltr; background:#eee url('…') center/cover">&nbsp;</td>
  <td style="direction:ltr">…text…</td>
</table>
```

Source order controls mobile stacking. `direction` controls desktop layout. One markup, two behaviours.

## Key Lessons Learned

**1. Judge a dependency by whether its model matches your problem, not by whether you can force it to work.** I patched five API mismatches before questioning the package. Repeated patching is a signal to re-evaluate the choice, not to keep patching. Removing it was faster than the patches had been.

**2. Verify the artifact, not the intent.** The effective setting, the compiled output, the message the provider actually stored. Every stubborn bug today — the console backend, the gradients, the field widths, the broken images — collapsed the instant someone looked at the real thing instead of reasoning about what should be there.

**3. Make correctness self-healing wherever config can drift.** A setup step in a README is a bug waiting for the next deploy. Code that reconciles state on read never rots.

**4. A preview that renders in a different engine than production is not a preview.** The CMS preview is a browser; the destination is a mail client. I have to send a real test to a real inbox before believing anything.

**5. When constraints genuinely conflict, surface the tradeoff — don't silently pick.** Cover image *or* gradient. Full-height columns *or* trivial mobile stacking. Visible unsubscribe *or* clean layout. Every time one of those got quietly resolved for me, I discovered it later as a bug.
