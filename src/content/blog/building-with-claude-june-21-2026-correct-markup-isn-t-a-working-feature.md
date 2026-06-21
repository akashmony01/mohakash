---
title: "Building with Claude: Correct Markup Isn't a Working Feature"
date: 2026-06-21
category: Building with Claude
excerpt: Today was one of those debugging sessions that humbles you — or in this case, humbles the AI I was pairing with. What started as a simple "hey, can you check how this form works?" turned into a multi-hour investigation across email plumbing, magic links, and a YouTube embed that refused to cooperate. Here's the honest account.
draft: false
hidden: false
cover: /uploads/a.webp
resources: []
---

Today was one of those debugging sessions that humbles you — or in this case, humbles the AI I was pairing with. What started as a simple "hey, can you check how this form works?" turned into a multi-hour investigation across email plumbing, magic links, and a YouTube embed that refused to cooperate. Here's the honest account.

## The problem we were solving

The site has a gated resources feature: users fill out a form, get an email with a single-use magic link, and click through to either download a file (PDF, brochure, case study) or watch an embedded video/webinar. I wanted to wire it up locally and actually test it end-to-end using MailCrab as a fake inbox.

Three distinct problems surfaced along the way:

1. **Emails weren't going anywhere.** The dev settings used Django's console backend, so emails printed to the terminal instead of being deliverable.
2. **Document links 404'd.** Clicking a download link for the data sheet threw a "Page not found," raised by `wagtail.views.serve`.
3. **Video links threw "Error 153 / Video player configuration error."** The webinar and video posts showed a broken player with only a "Watch on YouTube" fallback.

## The approach we took

For email, the fix was straightforward — point Django at MailCrab's SMTP server:

```python
# dev.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
```

A quick `send_mail()` test confirmed delivery, and the magic-link flow lit up in MailCrab. Clean win.

The 404 was a data problem masquerading as a bug. The download view did this:

```python
if self.document:
    ...           # serve the file
elif self.video_url:
    ...           # render the player
else:
    raise Http404 # ← every seed page landed here
```

None of the seed pages had a file attached, so every PDF resource fell straight through to a raw 404. We attached test documents and the downloads worked. (As a side note, that `raise Http404` is a smell — a missing file should show a friendly message, not a dead end. Worth hardening later.)

Then came the video. The template embedded the URL directly:

```html
<iframe src="{{ video_url }}" ...></iframe>
```

Claude spotted that an editor pasting a `watch?v=...` link would break the iframe — YouTube needs the `/embed/` form — so it wrote a normalizer to convert any YouTube or Vimeo URL into an embeddable one. Reasonable fix. And this is where things went off the rails.

## Where it went wrong

Claude proved — three separate times, with curl against the live server — that we were emitting a perfectly valid `youtube.com/embed/...` iframe with a 200 status. From that, it concluded the app was correct and the problem must be my environment: first a browser extension, then a DNS/network filter. It told me, with real confidence, *"No code change can fix this."*

A code change fixed it. Swapping `youtube.com` for `youtube-nocookie.com` made the video play instantly:

```python
yt = re.search(
    r'(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/)|youtu\.be/)([\w-]+)',
    url,
)
if yt:
    return f'https://www.youtube-nocookie.com/embed/{yt.group(1)}?rel=0'
```

The whole fix took thirty seconds. The certainty that it was hopeless cost far more.

The core mistake was conflating *"the iframe `src` is well-formed"* with *"the embed will work."* Curling the server, seeing a syntactically valid URL, and declaring victory on our side — but a correct URL pointing at a domain that's blocked or restricted in my context is still a broken feature. **Correct markup is not a working feature.** There was also too much anchoring on one theory at a time — watch-vs-embed, then extensions, then DNS — each presented as near-certain instead of held loosely.

## What I got right

Worth calling out: I kept saying "I don't think the iframe is working," and I was right every single time. While Claude was busy proving the markup was fine, I was looking at the actual broken result on my screen. The person staring at the symptom usually has better data than the tool staring at the curl output — and it's worth trusting that instinct even when the assistant sounds sure.

## What was partially right

The cause probably *was* environmental — `youtube-nocookie.com` working while `youtube.com` didn't is the classic signature of a blocklist (Pi-hole, NextDNS, a corporate filter) that covers the main domain but not the privacy one. So the instinct about *where* the failure lived wasn't crazy. The botched leap was going from "the cause is environmental" to "there's nothing we can do." Those are completely different claims.

## Key Lessons Learned

**1. Correct markup is not a working feature.** Proving the server emits a valid URL tells you the string is well-formed — nothing more. The only proof a feature works is the feature working in front of a real user. Curl can confirm syntax; it cannot confirm that YouTube will actually render the frame. When an assistant declares victory from a green checkmark on the server side, push it to look at the actual rendered result.

**2. "It's environmental" is a reason to harden, not to stop.** When a failure traces back to the network, browser, or some external service, that's not the end of the investigation — it's the start of a resilience question. Can the code route around it? A `nocookie` domain, a fallback, a graceful error message? The job isn't done when blame is located; it's done when the feature survives the environment it'll actually run in.

**3. Try the cheap fix before assigning blame.** The `nocookie` swap was thirty seconds of work, but it sat behind multiple confident speeches about my network. If a potential fix is cheaper than the argument about whose fault it is, just try it first. The cost asymmetry is enormous.

**4. Trust the human watching the symptom.** The assistant cycled through three explanations, each delivered as near-certain. Confidence framed as proof shuts down the conversation and wastes time when it's wrong. I could see the broken player the whole time — "I don't think it's working" was better data than "I've proven it works." When you're the one looking at the real result, hold your ground.

The flip side of all this: we *did* ship real fixes. Email works through MailCrab, downloads serve actual files, and the video embed is now genuinely more robust — `nocookie` domain, referrer policy, proper attributes, and a normalizer that handles whatever URL an editor pastes. The work was good. The certainty was the bug.
