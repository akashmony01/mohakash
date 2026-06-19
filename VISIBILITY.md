# Visibility Checklist — getting mohakash.xyz found by Google & AI

A step-by-step checklist to make the site discoverable in search engines and AI
assistants (ChatGPT, Claude, Perplexity). Work top to bottom; tick boxes as you go.

**Why this was needed:** the site was live but invisible — Cloudflare was
blocking AI crawlers (403), and Google had never indexed it. The engineering /
on-page SEO was already fine; the gap was operational (dashboards) and off-site
(backlinks).

---

## Status at a glance

- [x] **Step 1 — Unblock AI crawlers in Cloudflare** ✅ DONE
- [x] **Step 1b — robots.txt policy (allow citation, no training)** ✅ DONE (pushed, commit `7ed9910`)
- [x] **Step 2 — Google Search Console** ✅ DONE (verified + sitemap submitted)
- [x] **Step 3 — Bing Webmaster Tools** ✅ DONE (imported from Google; Bingbot crawl verified)
- [ ] **Step 4 — Backlinks** ← do this next
- [ ] **Step 5 — Check progress over the following weeks**

---

## ✅ Step 1 — Cloudflare: unblock AI bots (DONE)

Cloudflare's "Block AI bots" was returning `403` to GPTBot/ClaudeBot/PerplexityBot/etc.
It was turned off. Verified live: AI bots now return `200`.

Re-check anytime:
```bash
for ua in "ClaudeBot/1.0" "OAI-SearchBot/1.0" "PerplexityBot/1.0" "ChatGPT-User/1.0"; do
  curl -s -o /dev/null -w "%{http_code}  $ua\n" -A "Mozilla/5.0 (compatible; $ua)" https://mohakash.xyz/
done
# All should print 200
```

robots.txt policy (also done, deployed): search engines + AI assistants may index
and **cite** pages; AI **training** crawlers are disallowed.
```bash
curl -s https://mohakash.xyz/robots.txt | grep Content-Signal
# -> Content-Signal: search=yes, ai-input=yes, ai-train=no
```

---

## ⬜ Step 2 — Google Search Console (most important for Google)

This is what gets the site into Google's index. ~10 minutes of setup, then Google
crawls over the following days.

### 2a. Add the property
- [ ] Go to **https://search.google.com/search-console** and sign in.
- [ ] Property dropdown (top-left) → **Add property**.
- [ ] Choose the **Domain** option (left box, NOT "URL prefix") → type `mohakash.xyz` → **Continue**.
- [ ] Google shows a **TXT record** like `google-site-verification=AbC123...` — **copy it**. Keep the tab open.

### 2b. Add the TXT record in Cloudflare
- [ ] Open **Cloudflare → `mohakash.xyz` zone → DNS → Records → Add record**.
- [ ] Set:
  - **Type:** `TXT`
  - **Name:** `@`  (the root domain)
  - **Content:** paste the full `google-site-verification=...` string
  - **TTL:** Auto
- [ ] **Save.**

### 2c. Verify
- [ ] Back in the Google tab → click **Verify**.
- [ ] If "not found," wait 5–10 min for DNS, then Verify again. ✅

### 2d. Submit the sitemap
- [ ] Left sidebar → **Sitemaps**.
- [ ] Enter the **full URL** → **Submit**:
      ```
      https://mohakash.xyz/sitemap-index.xml
      ```
      ⚠️ On a **Domain property** the box does NOT pre-fill the domain, so paste the
      whole URL (not just the filename). Use `sitemap-index.xml`, NOT `sitemap.xml`
      (that URL 404s — it's normal).
- [ ] Status should become "Success" within a day.

### 2e. Request a first crawl
- [ ] Top search bar → paste `https://mohakash.xyz/` → Enter → **Request indexing**.
- [ ] Repeat for: `/blog`, `/poetry`, `/projects`, `/research`, and one real post URL.

---

## ✅ Step 3 — Bing Webmaster Tools (DONE — covers Bing + DuckDuckGo + Copilot)

Done via **Import from Google Search Console** (auto-verified + sitemap imported).
Bingbot crawl access verified: `/`, robots.txt, and both sitemaps return `200`.
(Bing's sitemap may show "Pending" for a day or two — normal, leave it.)

---

## ⬜ Step 4 — Backlinks (the long-term ranking lever)

A new domain with no inbound links can't rank for a common name. Add `mohakash.xyz`
to the "website" field of your profiles (~15 min):
- [ ] **GitHub** — `akashmony01` profile bio + a profile README.
- [ ] **LinkedIn**
- [ ] **X (Twitter)**
- [ ] **Instagram**
- [ ] **Facebook**
- [ ] *(Optional)* A launch post ("building my site in public with Claude") in a dev
      community; share the poetry in Bengali-poetry communities.

These create your first crawlable links and help Google connect
"Mohammed Akash → mohakash.xyz".

---

## ⬜ Step 5 — Check progress (over the following weeks)

- [ ] **Search Console → Pages**: "indexed" count should climb over days–2 weeks.
- [ ] **Google**: `site:mohakash.xyz` should start returning your pages.
- [ ] **AI test**: ask ChatGPT / Perplexity "what is mohakash.xyz about?" — should
      fetch and summarize it (this already works after Step 1).

### Realistic expectations
| Goal | When |
|---|---|
| AI tools can reach & cite the site | ✅ already working (Step 1) |
| Pages indexed by Google | days → ~2 weeks after Step 2 |
| Rank for distinctive terms ("moh akash", "mohakash infinite sky", "Mohammed Akash Bengali poetry") | weeks (winnable — low competition) |
| Rank for the bare name "Mohammed Akash" | months, if ever — very common name; depends on backlinks (Step 4) |

---

## Notes
- Steps 2a / 3 need your Google / Microsoft logins — only you can do them.
- The DNS TXT part (2b) is in Cloudflare; if you paste the `google-site-verification=...`
  value here, I can double-check exactly what to enter.
- Sitemap lives at `https://mohakash.xyz/sitemap-index.xml` (the plain `/sitemap.xml`
  404 is expected and harmless).
