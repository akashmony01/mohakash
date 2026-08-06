---
title: "Building with Claude, August 6, 2026: My Back Was Killing Me, So I Built Something I Couldn't Ignore"
date: 2026-08-06
category: Building with Claude
excerpt: Today I spent the day turning a seventy-line shell script into something a stranger could install, and along the way I learned that the bugs which survive longest aren't the ones that crash — they're the ones that quietly return a plausible wrong answer. My back had been aching for weeks from sitting too long. What I actually debugged, though, was my own assumption about why every reminder I'd ever installed had failed.
featured: false
draft: false
hidden: false
cover: ''
resources:
  - label: Download for Linux
    href: https://github.com/akashmony01/BackAtIt/releases/latest
    kind: link
---

## Opening Hook

Today I spent the day turning a seventy-line shell script into something a stranger could install, and along the way I learned that the bugs which survive longest aren't the ones that crash — they're the ones that quietly return a plausible wrong answer. My back had been aching for weeks from sitting too long. What I actually debugged, though, was my own assumption about why every reminder I'd ever installed had failed.

## The Problem We Were Solving

The surface problem was simple: I sit still for too long, my back hurts, and I need to get up more often.

The real problem category turned out to be something else entirely — **keeping a background process and a user interface in agreement about shared state**, and then the long slog of hardening a personal prototype into something distributable. Almost every difficult moment today was one of those two things. Either two processes had different ideas about what was true, or an assumption that held fine on my machine fell apart the moment installation, packaging, or another user entered the picture.

That's a category worth naming because it shows up everywhere. Any time you have a daemon and a GUI, a server and a client, a worker and a dashboard, you have the same shape of problem: two things holding a belief about the same state, updating on different schedules, and lying to the user whenever they drift apart.

## What I Tried First (The Approach)

My original script was about as naive as it gets:

```sh
while true; do
  sleep "$INTERVAL"
  play_sound &
  show_popup       # a simple system dialog
done
```

My mental model was: *the reminder needs to fire.* That's it. If a popup appears and a sound plays, I'll get up. So my entire design effort went into making sure the loop didn't die.

Two things bothered me and I couldn't work out why. First, the sound played once and then stopped. Second — and this was the one that made me want to rebuild the thing — I kept missing the reminders entirely. I'd find the popup sitting there half an hour later, still waiting for me.

My theory at the time was that I needed it *louder*. A longer sound, a bigger window. That was the wrong diagnosis, and it took someone asking the right question to see it.

## What I Got Wrong

I assumed the problem was that the reminders weren't reaching me. They were reaching me perfectly. **I was dismissing them without ever consciously registering that they'd appeared.**

That distinction matters enormously. If a reminder isn't firing, you fix the timer. If a reminder fires and gets waved away below the level of conscious thought, no amount of volume helps — you have to make dismissal *require a decision*. I'd spent weeks assuming I had a delivery problem when I had an attention problem.

The sound thing was similarly embarrassing. It wasn't misconfigured. I'd pointed it at a system test clip that was **1.4 seconds long**, and the command played it exactly once. Blink and it's gone. I'd been treating a one-and-a-half-second beep as an alarm.

Later in the day I made a more expensive mistake. I'd asked for a cleanup script that removed every trace of the app so I could test a fresh install. It had a flag to also delete the working copy, and it saved the built package first so I could reinstall. I ran it. It did exactly what it said. What neither of us had thought about was that the safety net protected the *package* but not the **test suite** — which wasn't in the package. I deleted my own tests and didn't notice until I went to run them.

I also assumed that because the app's icon appeared correctly in the applications menu, it would appear in the dock too. Different mechanism entirely, which I'll come back to.

## What Claude Got Wrong

Claude made more mistakes than I did today, and the interesting thing is that they were all the *same species* of mistake.

The worst one shipped and ran for days. Reading the system's idle time out of a text response, it wrote:

```sh
[[ $reply =~ ([0-9]+) ]]      # grab the number
```

The reply looked like `(uint64 44793,)`. That pattern matched the **64 in the type name**, not the value. So the "don't alarm an empty room when I'm already away" feature silently never worked. It didn't crash. It didn't log anything. It confidently returned zero every single time, which reads as *"the user is right here"*, so the app dutifully alarmed empty rooms for days. The fix was to anchor on the label:

```sh
[[ $reply =~ uint64\ ([0-9]+) ]]
```

The same shape appeared twice more. A counter using `grep -c` inside a fallback:

```sh
count=$(grep -c "$pattern" "$file" || echo 0)   # prints "0" twice
```

because `grep -c` prints `0` *and* exits non-zero when nothing matches. And a whitelist check where the list of valid keys spanned several lines, so any key sitting at a line boundary silently failed the membership test — two of my settings were being ignored with no error at all.

Claude also stated flatly that my desktop's software centre couldn't install a certain package format. I installed it that way anyway and the system log proved it had gone through fine. It had asserted a platform behaviour without checking, and I'd have believed it if I hadn't happened to try.

Then there was the rename. I changed the app's name, Claude did the pass, and it **missed exactly one line** still pointing at the old icon name. That was the bug I reported back the next time I opened the app: right icon in the menu, generic icon in the dock.

And three separate times, a test suite went red and the product was fine — Claude's own test harness had mangled string escaping while passing values between languages. Twice it nearly "fixed" working code because of it. To its credit, each time it checked the product's behaviour directly before touching anything, and caught that the harness was the liar.

One more: at one point it wrote a file into a repository I hadn't asked it to touch. Small thing, but it decided where my work should live instead of asking.

## What We Actually Solved

Once I understood the problem as *attention* rather than *delivery*, the design fell out.

The alert takes the whole screen, and — this is the part that actually works — **it refuses the keyboard entirely**:

```python
window.connect("key-press-event", lambda *_: True)   # swallow everything
for button in buttons:
    button.set_can_focus(False)                       # nothing to activate
```

Plus the buttons stay dead for three seconds. Why that matters: a reminder *always* arrives mid-sentence. If a keystroke can dismiss it, you'll dismiss it with the next character you type and never know it appeared. The failure mode only occurs in exactly the situation the feature exists for.

The other fix I'm pleased with came from measuring instead of guessing. The start/stop button felt sluggish and I assumed writing settings to disk was the cost. Claude measured it: **0.64 milliseconds**. The real cause was a background loop that only re-checked every five seconds. So the fix wasn't optimisation at all — it was waking the loop immediately, plus updating the button optimistically while the daemon caught up. That took it from about **2,700 ms to 67 ms**.

There's a design lesson lurking in the timer too. The countdown lived in memory:

```sh
remaining=$INTERVAL     # resets on every restart
```

Fine for a thirty-minute break. Completely useless for anything measured in days, because you log out before it ever reaches zero. Anything longer than a session needs an absolute due-time stored on disk, not a countdown held in RAM.

## Key Lessons Learned

**The dangerous bug returns a plausible answer, not an error.** Every serious bug today produced output that *looked* like a result — a number, a count, a zero. Nothing complained, so nothing got investigated. I now assume that any value crossing a boundary (a subprocess, a config file, another language) is wrong until I've seen the actual value, not just seen the code run without complaining.

**Measure before you fix.** I was certain the disk write was the bottleneck. It was 0.64 ms against a five-second poll — four orders of magnitude off. Guessing cost me nothing only because someone measured before acting on my theory.

**When a test goes red, check the harness before you believe it.** Three times the failure was in the test, not the code. If I'd "fixed" the product on the strength of those, I'd have broken working software to satisfy a broken test.

**Design for the moment the feature matters.** An interruption tool has to work while you're mid-flow, because that's the only time it fires. Testing it while idle proves nothing at all.

**Destructive tooling must protect what you didn't think to protect.** My cleanup script saved the artifact I'd remembered and destroyed the one I hadn't. If a script can delete things, the safety net needs to cover the whole working state, not the one file that was top of mind when you wrote it.
