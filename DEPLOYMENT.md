# Deployment & Hosting Plan — mohakash.xyz

The ordered, do-it-once plan to take the site from "works on my laptop" to
"live on mohakash.xyz with a CMS, contact form, and newsletter." Work through
the **Parts in order** — each part depends on the ones before it. Tick the
boxes as we finish.

## The final stack

| Layer | Tool | Cost |
|---|---|---|
| Source of truth | **GitHub** repo | Free |
| Hosting + build | **Cloudflare Pages** (auto-deploys on git push) | Free |
| CMS (edit anywhere) | **Sveltia CMS** (static `/admin` page) → commits back to the repo | Free |
| Contact form | **Cloudflare Pages Function** + **Resend** + **Turnstile** | Free |
| Newsletter | **Kit** (ConvertKit) free plan — up to 10k subscribers | Free |
| DNS + domain | **Cloudflare DNS** | Free |

**Flow once live:** edit at `mohakash.xyz/admin` → Sveltia commits to GitHub
→ Cloudflare Pages rebuilds → site updates (~1 min). Local `git push` works the
same way. GitHub is always the hub. Sveltia is a static single-page admin (built
in Svelte, framework-agnostic) that talks to the GitHub API directly — it needs
**no server adapter**, so the site stays a plain static Pages deploy.

---

## Accounts we'll need (gather these first)

- [ ] **GitHub** account (+ ability to create a repo)
- [ ] **Cloudflare** account (free)
- [ ] **Resend** account (free) — for contact-form email delivery
- [ ] **Kit** account (free) — for the newsletter
- [ ] **Namecheap** (or wherever `mohakash.xyz` is registered) login — to point nameservers at Cloudflare

> When a step needs you to log in / click in a dashboard, I'll tell you exactly
> what to do and you run it; I handle all the code/config changes.

---

## Part 0 — Local pre-flight (no accounts yet)

**Goal:** make sure the project is clean and builds before we ship it anywhere.

- [x] Confirm a clean static build: `npm run build` → **16 pages, no errors** ✓ (2026-06-10)
- [x] Confirm `.gitignore` covers `node_modules/`, `dist/`, `.astro/`, `.env*` ✓
- [x] Note placeholder assets to replace later (now itemized precisely in **Part 7**) ✓
- [x] Portrait check: `/uploads/portraitLight.png` + `/uploads/portraitDark.png` both exist and are wired in `general.json` — **not** a placeholder ✓
- [x] Repo name + visibility decided: **`mohakash`, public** ✓ (2026-06-10)

**Done when:** `npm run build` is green locally. ✅ **PART 0 COMPLETE.**

---

## Part 1 — Get the project into GitHub

**Goal:** repo exists on GitHub; it's the source of truth everything else hangs off.
**Depends on:** Part 0.

- [x] `git init -b main` ✓
- [x] First commit (`80f13ae`) — 60 files, no gitignored cruft ✓
- [x] GitHub repo created by you: **`akashmony01/mohakash`** (`git@github.com:akashmony01/mohakash.git`) ✓
- [x] Added remote + `git push -u origin main` (SSH auth worked) ✓
- [x] Verified: remote = local, 60 files, no `node_modules`/`dist` on remote ✓

> Note: `feedback.md` (internal notes) was removed from disk before commit, so it's correctly NOT in the public repo.

**Done when:** the repo is on GitHub with a clean file list. ✅ **PART 1 COMPLETE.**

---

## Part 2 — First Cloudflare Pages deploy (plain static)

**Goal:** the site is live on a `*.pages.dev` URL — baseline deploy before we add CMS/forms.
**Depends on:** Part 1.

- [ ] In Cloudflare dashboard → **Workers & Pages → Create → *Pages* tab → Connect to Git** (⚠️ NOT "Import a repository", which creates a *Worker* with a `npx wrangler deploy` step — wrong for a static site)
- [ ] Pick the GitHub repo, authorize Cloudflare to read it
- [ ] Build settings: **Framework = Astro**, build command `npm run build`, **output dir `dist`** (Pages uses an output dir, not a deploy command)
- [ ] Deploy → get the `https://<project>.pages.dev` URL
- [ ] Open it, click around (themes, nav, all 4 sections) — confirm it works

**Build-environment gotcha (RESOLVED 2026-06-11):** builds failed with
`npm ci ... Missing @emnapi/core/runtime from lock file`. Root cause: Cloudflare's
build image **pins npm 10.9.2** (even when `.nvmrc` forces node 24 — it does NOT
use node's bundled npm 11), while local dev uses npm 11. The two npm versions
produce incompatible lockfiles for Tailwind oxide's optional wasm deps
(`@emnapi/*`), and the mismatch can't be reconciled (npm 10 demands
`@emnapi/core` in the lockfile; neither local npm 10 nor 11 will add it).
**Fix that worked:** stop committing `package-lock.json` — it's now in
`.gitignore`, so Cloudflare runs the lenient **`npm install`** instead of strict
`npm ci`. `.nvmrc` = `24` is kept so the cloud build's *node* matches local
(npm is still 10.9.2 in CI, which is fine for `npm install`). Do NOT re-commit a
lockfile, and do NOT delete `.nvmrc`.

**Note on the first attempt:** the project was first created as a **Worker**
(the "Import a repository" flow, which shows a `Deploy command: npx wrangler
deploy`). That deploy step fails for a static site with no `wrangler` config.
Recreate it via the **Pages** tab instead (above), which serves `dist/` directly
with no deploy command. The `.nvmrc` fix applies to either project type.

**Done when:** the site loads correctly on the `.pages.dev` URL, and pushing to
`main` triggers an automatic redeploy. ✅ **PART 2 COMPLETE (2026-06-11)** —
live at **https://mohakash.pages.dev/** (production build = commit `4ada51d`).
Auto-deploy on push to `main` confirmed working. Per-deployment hashed preview
URLs (e.g. `<hash>.mohakash.pages.dev`) are normal — kept for rollback history.

> At this point the CMS isn't wired up yet and the forms still say "not
> connected yet" — that's expected. We're confirming hosting works first.

---

## Part 3 — Custom domain + DNS on Cloudflare

**Goal:** site live on `mohakash.xyz` with HTTPS. Needed before the CMS GitHub
login and Resend (callback URLs / email domain use the real domain).
**Depends on:** Part 2.

- [ ] In Cloudflare → **Add a site** → `mohakash.xyz` (free plan) → Cloudflare gives you 2 nameservers
- [ ] In Namecheap → set the domain's nameservers to Cloudflare's two → wait for propagation (minutes–hours)
- [ ] In the Pages project → **Custom domains** → add `mohakash.xyz` and `www.mohakash.xyz`
- [ ] Confirm Cloudflare auto-issues the SSL cert (green padlock)
- [ ] Decide redirect direction (recommend `www` → apex, or vice versa) and set it

**Done when:** `https://mohakash.xyz` serves the site with a valid certificate.
✅ **PART 3 COMPLETE (2026-06-11)** — nameservers moved to Cloudflare
(`lady`/`benedict.ns.cloudflare.com`); `mohakash.xyz` + `www` attached to the
Pages project as custom domains, both Active with SSL. Canonicalization handled
in `functions/_middleware.ts`: 301 `mohakash.pages.dev` → `mohakash.xyz` (the
`.pages.dev` URL can't be disabled, only redirected) and `www` → apex.

---

## Part 4 — Sveltia CMS (edit from anywhere)

> **Why Sveltia CMS (decided 2026-06-13).** It's a **single static `/admin`
> page** (Svelte-based, but framework-agnostic) that talks to the GitHub API
> directly and commits Markdown/JSON to the repo. No server adapter, no Workers
> migration, no KV — it runs as-is on the existing static Pages site, and has
> great mobile support so the site is editable from a phone. A server-rendered
> CMS would have forced migrating this static Pages deploy to Workers + KV, which
> we deliberately avoided.

**Goal:** log in at `mohakash.xyz/admin`, edit content, and have it commit back
to GitHub → auto-redeploy.
**Depends on:** Part 3 (needs the live domain as the OAuth callback origin).

**Code changes (I do these):**
- [ ] Add `public/admin/index.html` (loads the Sveltia CMS script) and `public/admin/config.yml` (collections/files mirroring `src/content.config.ts` + `src/data/*.json`, media → `public/uploads`)
- [ ] Set the GitHub backend in `config.yml`: `backend: { name: github, repo: akashmony01/mohakash, branch: main, base_url: <auth-worker-url> }`

**Auth (you do these, I guide) — Sveltia needs a tiny OAuth helper:**
- [ ] Create a **GitHub OAuth App** (Settings → Developer settings → OAuth Apps) with the callback URL pointing at the auth worker
- [ ] Deploy the free [`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) Cloudflare Worker (holds the OAuth **Client ID + Secret** as *its own* Worker secrets — they never touch the Pages project or the browser)
- [ ] Point `config.yml`'s `base_url` at that worker
- [ ] (Alternative for solo use: skip the worker and sign in with a repo-scoped **fine-grained PAT** — token stays in your browser)

**Verify:**
- [ ] Visit `mohakash.xyz/admin` → log in with GitHub
- [ ] Make a tiny test edit → confirm it creates a commit in the GitHub repo
- [ ] Confirm Cloudflare Pages rebuilds and the change appears live

**Done when:** an edit made in the browser (incl. phone) shows up as a GitHub
commit and then on the live site.

---

## Part 5 — Contact form (Pages Function + Resend + Turnstile)

**Goal:** the contact form actually emails you, with spam protection.
**Depends on:** Part 3 (domain) for Resend verification. Independent of Part 4.

**Resend setup (you, I guide):**
- [ ] Create Resend account → **Add domain** `mohakash.xyz`
- [ ] Resend gives DNS records (DKIM/SPF/DMARC) → add them in **Cloudflare DNS** → verify
- [ ] Create a Resend **API key**

**Turnstile setup (you):**
- [ ] Cloudflare → **Turnstile** → add a widget for `mohakash.xyz` → get **Site key** + **Secret key**

**Code (I do):**
- [ ] Add `functions/api/contact.ts` (Pages Function): verify the Turnstile token, then send the message via Resend to your inbox
- [ ] Add the Turnstile widget to `ContactForm.astro` and include its token in the POST
- [ ] Point `PUBLIC_CONTACT_ENDPOINT` at `/api/contact`

**Env vars in Cloudflare Pages:**
- [ ] `RESEND_API_KEY`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `CONTACT_TO_EMAIL` (soulfulwater@gmail.com)
- [ ] `PUBLIC_CONTACT_ENDPOINT` = `/api/contact`

**Verify:**
- [ ] Submit the form on the live site → email lands in your inbox
- [ ] Confirm the honeypot + Turnstile block obvious spam

**Done when:** a real submission reaches your inbox and spam is filtered.
✅ **PART 5 COMPLETE (2026-06-11)** — implemented as `functions/api/contact.ts`
(Pages Function) + Turnstile widget in `ContactForm.astro`. Verified: a real
submission from `mohakash.pages.dev` arrived in the inbox. Env vars set in Pages
Production: `PUBLIC_CONTACT_ENDPOINT=/api/contact`, `PUBLIC_TURNSTILE_SITE_KEY`,
`CONTACT_TO_EMAIL`, `RESEND_API_KEY` (secret), `TURNSTILE_SECRET_KEY` (secret).
**Post-DNS follow-up:** once `mohakash.xyz` is verified in Resend (needs Part 3),
set `CONTACT_FROM_EMAIL` to a `@mohakash.xyz` sender so mail comes from the
domain instead of Resend's `onboarding@resend.dev` test sender.

---

## Part 6 — Newsletter (Kit)

**Goal:** the newsletter form captures subscribers into Kit.
**Depends on:** the site being live (Part 2/3). Independent of Parts 4–5.

**Kit setup (you):**
- [ ] Create Kit account → create an **audience/form**
- [ ] Grab the form's endpoint (and, if we proxy, an API key)

**Code (I do) — two options, pick one:**
- [ ] **Simple:** point `PUBLIC_NEWSLETTER_ENDPOINT` at Kit's hosted form action and map the field name Kit expects
- [ ] **Cleaner (recommended):** small Pages Function `functions/api/subscribe.ts` that calls Kit's API (keeps the API key server-side, lets us keep our own JSON shape + success UI)

**Env vars (if using the proxy):**
- [ ] `KIT_API_KEY`
- [ ] `KIT_FORM_ID`
- [ ] `PUBLIC_NEWSLETTER_ENDPOINT` = `/api/subscribe`

**Verify:**
- [ ] Subscribe with a test email on the live site → it appears in Kit
- [ ] Confirm Kit's confirmation/welcome email behaves as you want

**Done when:** a signup on the site shows up as a Kit subscriber.

---

## Part 7 — Go-live polish & content

**Goal:** replace placeholders, final checks, real launch.
**Depends on:** Parts 4–6 (so CMS edits + forms are all working).

- [ ] ~~Portrait~~ — already done (`/uploads/portraitLight.png` + `/uploads/portraitDark.png` exist & wired). Swap for nicer photos only if you want.
- [ ] Replace 5 placeholder **social URLs** in `src/data/social.json` (currently bare domains): GitHub `https://github.com/`, X `https://x.com/`, LinkedIn, Instagram, Facebook
- [ ] Replace the placeholder **repo URL** in `src/content/projects/personal-site.md` (`repo: "https://github.com/"`) — fill in once the repo exists (Part 1)
- [ ] Personalize the **About** section copy (education, etc.)
- [ ] Verify SEO basics: page titles/meta, sitemap, RSS feed
- [ ] Test on mobile + both light/dark themes on the live domain
- [ ] Final end-to-end pass: CMS edit → commit → redeploy → contact email → newsletter signup

**Done when:** everything above is real (no placeholders) and verified on `mohakash.xyz`.

---

## Master environment-variable list (for Cloudflare Pages settings)

| Variable | Part | Public? | Purpose |
|---|---|---|---|
| `RESEND_API_KEY` | 5 | no | Send contact email |
| `TURNSTILE_SECRET_KEY` | 5 | no | Verify anti-spam token |
| `PUBLIC_TURNSTILE_SITE_KEY` | 5 | yes | Turnstile widget |
| `CONTACT_TO_EMAIL` | 5 | no | Where messages go |
| `PUBLIC_CONTACT_ENDPOINT` | 5 | yes | `/api/contact` |
| `KIT_API_KEY` | 6 | no | Newsletter (if proxied) |
| `KIT_FORM_ID` | 6 | no | Newsletter form |
| `PUBLIC_NEWSLETTER_ENDPOINT` | 6 | yes | `/api/subscribe` or Kit URL |

> Sveltia (Part 4) needs **no** variables in the Pages project — its OAuth
> Client ID/Secret live as secrets on the separate `sveltia-cms-auth` Worker.

---

## Dependency order at a glance

```
Part 0  Local build OK
  └─ Part 1  GitHub repo
       └─ Part 2  Cloudflare Pages deploy (*.pages.dev)
            └─ Part 3  Custom domain + DNS  (mohakash.xyz live)
                 ├─ Part 4  Sveltia CMS (static /admin + auth worker)
                 ├─ Part 5  Contact form (Resend + Turnstile)   ─┐ Parts 4,5,6
                 └─ Part 6  Newsletter (Kit)                     │ are independent
                      └─ Part 7  Polish & go-live  ◄─────────────┘ of each other
```

Parts 4, 5, and 6 all only need Part 3 done — we can do them in any order once
the domain is live, but the list above is the recommended sequence.
