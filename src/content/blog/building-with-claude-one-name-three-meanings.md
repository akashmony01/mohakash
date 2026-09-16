---
title: 'Building with Claude: One Name, Three Meanings'
date: 2026-09-16
category: Notes
excerpt: Today I renamed the public address of a running web app — moving it from one hostname to another — and along the way learned that a "simple find-and-replace" is a trap when the same word quietly means three different things. What looked like a five-minute config tweak turned into a small lesson about separating a system's *address* from its *identity*.
featured: false
draft: false
hidden: false
cover: ''
resources: []
---

## Opening Hook

Today I renamed the public address of a running web app — moving it from one hostname to another — and along the way learned that a "simple find-and-replace" is a trap when the same word quietly means three different things. What looked like a five-minute config tweak turned into a small lesson about separating a system's *address* from its *identity*.

## The Problem We Were Solving

I had a live site reachable at one subdomain, and I wanted it reachable at a different one instead. The app itself wasn't changing at all — same code, same server, same database. Only the front door was moving.

This is the kind of task that feels trivial until you actually do it, because a deployment isn't one thing. There's the **public URL** people type into a browser; there's the **instance identity** on the server (the folder it lives in, the background service that runs it, the socket it listens on); and there's a **separate subdomain used only for outbound email**. All three happened to be built from the same short name. So when I said "change the name," I hadn't yet realized I was pointing at three unrelated concepts that merely shared a spelling.

Getting this wrong isn't cosmetic. Rename the wrong occurrence and you can silently break outbound email while the website looks perfectly fine — the worst kind of bug, because nothing errors out; messages just stop arriving.

## What I Tried First (The Approach)

My instinct was consistency: *go through every file, change the old name to the new one, and keep everything tidy.* I'd already edited the reverse-proxy config myself to point at the new hostname, and I asked Claude to sweep the rest of the repo so nothing stale was left behind.

My mental model was basically this:

```
old-name.example.com   →   new-name.example.com    (everywhere it appears)
```

In my head it was one string, one replacement. I even asked, half-checking myself, whether changing the web URL would affect the email setup — which turned out to be exactly the right question, for the wrong reason. I was worried the *website* rename might disturb email; the real risk was that a blanket rename would rewrite the *email* subdomain by accident.

## What I Got Wrong

I assumed all the occurrences of the name were the same thing. They weren't. When Claude actually listed every place the old name appeared, they fell into three buckets:

```
new-name.example.com        →  public web URL       →  CHANGE
/var/www/old-name           →  server instance path →  KEEP
mail.old-name.example.com   →  email sending domain →  KEEP
```

The instance paths (`/var/www/old-name`, the service name, the socket) had nothing to do with the public URL — they're the app's internal identity, and renaming them would have meant rebuilding the whole service for no reason. And the email subdomain was a *completely separate* DNS entity, verified independently for sending mail. If I'd run the tidy little `sed`-style replace I was imagining, it would have turned the mail subdomain into a hostname that doesn't exist, and outbound email would have died quietly.

I also assumed the URL change and email were tightly linked. They're not linked at all — the app sends mail through the email provider using the *email* subdomain, which is independent of whatever the website is called. Once I saw that, my anxiety about "will this break email?" flipped into "email literally cannot be affected by this, as long as I don't touch its records."

## What Claude Got Wrong

To be fair, on the rename itself Claude was careful — it enumerated every occurrence, classified each one, and deliberately left the email and instance references alone. But earlier in the same working session, it made a mistake worth calling out because it's such a common trap.

We'd added a small unread indicator — a coloured dot — to the header. Claude wrote the markup, I refreshed, and… no dot. Twice. The element was there in the page the whole time; it was just **invisible**. The reason: the CSS build tree-shakes away any utility class that isn't referenced in the templates, and the dot used classes (its colour, size, and position) that had never been used anywhere before. They'd been stripped out of the compiled stylesheet, so the element rendered with no size and no colour.

Claude had reasoned about the HTML and forgotten the build step. Its approach *looked* correct — the classes were spelled right, the logic was right — but it trusted the source instead of the rendered result. It only got caught because I said, plainly, "the dot isn't showing." The fix was to rebuild the stylesheet so the new classes were actually included. It also, separately, picked an icon for a "log out" button whose arrow pointed *into* a box (which reads as "log in") — a tiny thing, but again a case of grabbing something plausible without looking at the actual glyph.

The through-line in both misses: reasoning about a system on paper, rather than looking at what it actually produced.

## What We Actually Solved

The unlock was reframing "rename everything" as "**classify, then change only the address.**" Instead of a sweep, Claude searched for every occurrence of the old name and sorted each into *address*, *identity*, or *coupled service*. Only the address bucket got changed:

- the reverse-proxy site block (the public hostname)
- the app's allowed-hosts / trusted-origins settings
- the docs that referenced the URL

Everything in the identity and email buckets was left exactly as-is.

Then came the part I'm most glad we did properly: **verifying before the destructive step.** Before I deleted the old DNS record, we checked that the new hostname actually resolved and served a real response (a redirect to the login page, over HTTPS with a valid certificate), *and* that the email provider's DNS records were still present and intact. Only once both were confirmed did I remove the old record. So deleting it was a safe, evidence-backed action rather than a hopeful one.

The mental shift, in one line:

```
Before:  "change the name wherever it appears"
After:   "for each place the name appears, ask: is this the address,
          the identity, or a coupled service? Change only the address."
```

That's what made a potentially email-breaking migration completely boring — which is exactly what you want from infrastructure work.

## Key Lessons Learned

**1. One name can mean several unrelated things — enumerate before you replace.** The single biggest risk in this task was treating a shared string as a shared concept. A public URL, an internal service identity, and an email domain looked identical and were completely different. I learned to *list every occurrence and label it* before touching anything. Blanket find-and-replace is fine for prose; for infrastructure it's a foot-gun.

**2. Separate "address" from "identity."** A deployment's public URL is just a label you can move freely. Its identity — the folder, the service, the socket — is load-bearing and should stay put unless you truly mean to rebuild it. Keeping those two ideas apart turned a scary rename into a one-line change plus a DNS record.

**3. Verify state before any destructive action.** I didn't delete the old DNS entry until I'd confirmed the new one worked *and* the email records were untouched. Checking first turned "I hope this is safe" into "I can see this is safe." Every irreversible step deserves that two-minute confirmation.

**4. Trust the rendered result, not the source.** Claude's invisible-dot bug came from reasoning about markup while forgetting the build strips unused styles. The cure is embarrassingly simple: *look at the actual output.* If a UI change doesn't appear, assume the pipeline (build, cache, tree-shaking) ate it before assuming the logic is wrong.

**5. Coupled services are independent until proven otherwise.** I worried the website rename would break email; in reality they shared nothing but a naming coincidence. Understanding *how* a feature actually reaches the outside world — which domain, which provider, which records — told me instantly what my change could and couldn't affect. When in doubt, trace the real path rather than guessing at the coupling.
