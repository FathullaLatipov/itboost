# Deploying itboost.uz

The site is a static Astro build (`dist/`). Two supported hosts: **Vercel** (section 0) or
cPanel shared hosting (sections 1–7).

---

## 0. Vercel

`vercel.json` already sets the build (`npm ci` → `npm run build` → `dist/`), 301 redirects for the
legacy URLs, immutable caching for `/_astro/*` and basic security headers.

1. vercel.com → *Add New → Project* → import `FathullaLatipov/itboost` (production branch:
   `master`). Framework preset: Astro (detected automatically).
2. **Before the first deploy** → *Settings → Environment Variables* (Production + Preview):
   `PUBLIC_LEAD_MODE=telegram`, `PUBLIC_TG_BOT_TOKEN=…`, `PUBLIC_TG_CHAT_ID=…` — the same values as
   in your local `.env` (`.env` is gitignored and is NOT in the repository). Without them the lead
   form shows its error state. Changing variables requires a redeploy.
3. *Settings → Domains* → add `itboost.uz` and `www.itboost.uz` (redirect www → apex). At your
   DNS provider set: `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com` (Vercel shows the
   exact records). SSL is issued automatically.
4. `public/.htaccess` and `public/api/lead.php` are cPanel-only: Vercel ignores `.htaccess`, and
   it does not run PHP (`lead.php` would just be a static file there). Proxy mode (section 4) is
   therefore cPanel-only; on Vercel use telegram mode, and rotate the token (section 4, step 1).

---

## 1. Environment (`.env`)

The lead form's transport is configured at **build time**. Copy `.env.example` to `.env`
(gitignored) and fill it in:

| Variable | Mode | Meaning |
|---|---|---|
| `PUBLIC_LEAD_MODE` | both | `telegram` (default) — browser posts straight to Telegram · `proxy` — browser posts to `/api/lead.php` |
| `PUBLIC_TG_BOT_TOKEN` | telegram | Bot token. **Ends up in the public JS bundle.** |
| `PUBLIC_TG_CHAT_ID` | telegram | Chat that receives leads |
| `PUBLIC_LEAD_ENDPOINT` | proxy | Defaults to `/api/lead.php` |

`PUBLIC_*` values are inlined into the client JavaScript — treat everything in `.env` as public.
If the transport is not configured, the form shows the error state and logs
`[lead] config: …` in the browser console (it never fails silently).

> **Security status.** The bot token in use today was published in the legacy site's
> `index.html` (and remains in git history). It must be considered compromised. Telegram mode
> only exists to keep leads flowing until the token is rotated — follow section 4 as soon as
> possible.

## 2. Build

Requirements: Node **22.12+** (required by Astro 7) and npm.

```bash
npm ci
npm run build        # = astro check && astro build  → dist/
npm run preview      # optional local check of dist/ at http://localhost:4321
```

`dist/` contains: `index.html` (RU), `uz/index.html`, `404.html`, `_astro/` (hashed assets),
`sitemap-index.xml` + `sitemap-0.xml`, `robots.txt`, `.htaccess`, icons, `og-image.png`,
`site.webmanifest`, and `api/lead.php`.

Before uploading, make sure the build used the intended mode — look for anything shaped like a
Telegram bot token in the bundle:

```bash
grep -rlE "[0-9]{8,10}:[A-Za-z0-9_-]{30,}" dist/   # telegram mode: 1 file · proxy mode: no output
```

## 3. Upload to cPanel

1. **Back up the legacy site first.** cPanel → File Manager → select everything in
   `public_html` → *Compress* → download the archive (or move it to `~/legacy-site-YYYYMMDD/`,
   outside `public_html`).
2. Delete the old files from `public_html` (`index.html`, `inner-page.html`,
   `portfolio-details.html`, `translations_*.js`, `assets/`, …). Keep anything that is not part
   of the site: `.well-known/` (SSL validation), `cgi-bin/`, other apps.
3. Upload the **contents** of `dist/` (not the folder itself) into `public_html` — easiest is
   to zip `dist/*`, upload, and *Extract* in File Manager.
   - Hidden files must be included: `.htaccess` (enable *Settings → Show Hidden Files*).
4. cPanel → *Domains* → enable **Force HTTPS Redirect** for itboost.uz (the lead proxy only
   accepts `https://` origins).
5. If Engintron is active: WHM/cPanel → Engintron → *Purge cache* (or wait for its micro-cache
   to expire) so the new HTML is served.

### About `.htaccess` and Engintron

`public/.htaccess` sets: `ErrorDocument 404 /404.html`, 301s for `/inner-page.html`,
`/portfolio-details.html` and `…/index.html`, immutable caching for `/_astro/*`, `no-cache` for
HTML, gzip, and basic security headers. It requires Apache 2.4 (standard on cPanel/EasyApache 4).

Engintron's nginx may serve static files (images, CSS, JS) **directly**, without passing the
request to Apache — for those files the `.htaccess` headers/caching do not apply and nginx's
own defaults are used. HTML, redirects, the 404 page and PHP still go through Apache. If you
need the headers on every response, configure them in Engintron's `custom_rules` instead.
A Content-Security-Policy is intentionally not set yet; add one only after testing (the lead
form needs `connect-src https://api.telegram.org` in telegram mode).

## 4. Token rotation + switch to the proxy (recommended)

The proxy (`public/api/lead.php` → `https://itboost.uz/api/lead.php`) keeps the token on the
server and adds an origin check, validation, a honeypot and a rate limit (5 leads / 10 min / IP).

1. **Revoke the leaked token.** Telegram → @BotFather → `/mybots` → choose the bot →
   *API Token* → *Revoke current token*. Copy the new token. (From this moment the currently
   deployed telegram-mode build stops delivering leads — do steps 2–6 right away.)
2. **Store the new token outside the web root.** In File Manager create
   `/home/<cpanel-user>/itboost-lead-config.php` (the folder *above* `public_html`):

   ```php
   <?php
   return [
       'token'   => '1234567890:NEW-TOKEN-FROM-BOTFATHER',
       'chat_id' => '123456789', // same value as PUBLIC_TG_CHAT_ID in your current .env
   ];
   ```

   Permissions `600` (or `640`). Alternatively set `ITBOOST_TG_TOKEN` and `ITBOOST_TG_CHAT_ID`
   as environment variables for PHP — the script checks those first.
3. **Switch the build.** In `.env`:

   ```dotenv
   PUBLIC_LEAD_MODE=proxy
   PUBLIC_LEAD_ENDPOINT=/api/lead.php
   # remove PUBLIC_TG_BOT_TOKEN / PUBLIC_TG_CHAT_ID entirely
   ```

4. Rebuild: `npm run build`. The token check from section 2 must print nothing.
5. Upload `dist/` again (section 3). Make sure `public_html/api/lead.php` is present.
6. **Test** (below), then send one real lead from the site and confirm it arrives.

### Testing the proxy

The script could not be executed during development (no local PHP), so verify it on the host:

```bash
# wrong method → 405 {"ok":false,"error":"method_not_allowed"}
curl -i https://itboost.uz/api/lead.php

# no/foreign Origin → 403 forbidden_origin
curl -i -X POST https://itboost.uz/api/lead.php -H 'Content-Type: application/json' -d '{}'

# valid request (this sends a real message to the chat)
curl -i -X POST https://itboost.uz/api/lead.php \
  -H 'Origin: https://itboost.uz' -H 'Content-Type: application/json' \
  -d '{"name":"Test","phone":"+998 90 000 00 00","service":"Web Development","message":"Deploy test","lang":"ru","page":"https://itboost.uz/","company":""}'
# → 200 {"ok":true}
```

Error codes: `invalid_json`/`invalid_field` (400), `forbidden_origin` (403), `payload_too_large`
(413), `unsupported_media_type` (415), `rate_limited` (429), `not_configured` (500 — config file
missing/unreadable), `upstream_failed` (502 — Telegram rejected the request; see the PHP error
log: cPanel → *Errors* / `public_html/error_log`). The script never prints the token.

## 5. Post-deploy checklist

- [ ] `https://itboost.uz/` and `https://itboost.uz/uz/` load; language switch works.
- [ ] `https://itboost.uz/some-missing-page` shows the branded 404 (HTTP status 404).
- [ ] `https://itboost.uz/inner-page.html` and `/portfolio-details.html` → 301 to `/`.
- [ ] `https://itboost.uz/index.html` → 301 to `/`.
- [ ] Lead form: submit with empty fields shows inline errors; a real submission shows the green
      success panel and arrives in Telegram with `Язык:` and `Страница:` lines.
- [ ] A "Discuss" link on a service card pre-selects that service in the form.
- [ ] `https://itboost.uz/robots.txt`, `/sitemap-index.xml`, `/favicon.svg`, `/favicon.ico`,
      `/apple-touch-icon.png`, `/og-image.png`, `/site.webmanifest` return 200.
- [ ] Response headers (DevTools → Network): HTML `Cache-Control: no-cache`; `/_astro/*.js`
      `max-age=31536000, immutable` (unless served by nginx directly — see above).
- [ ] Share preview: paste the URL into Telegram — the OG card (`og-image.png`) appears. To
      refresh a cached preview use @WebpageBot.
- [ ] Google Search Console: submit `https://itboost.uz/sitemap-index.xml`; run the Rich Results
      test (Organization / ProfessionalService JSON-LD).

## 6. Regenerating brand assets

`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png` and `og-image.png`
are generated — edit `tools/make-og.py` / `tools/og-template.html`, then:

```bash
pip install playwright pillow && playwright install chromium
npm ci                       # Onest font files are read from node_modules
python tools/make-og.py      # or: --only og | --only icons
```

## 7. Rollback

Restore the archive from step 3.1 into `public_html` (delete the new files first).
