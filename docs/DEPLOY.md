# Deploying itboost.uz

The site is a static Astro build (`dist/`). Two supported hosts: **Vercel** (section 0) or
cPanel shared hosting (sections 1–7).

---

## 0. Vercel

`vercel.json` already sets the build (`npm ci` → `npm run build` → `dist/`), 301 redirects for the
legacy URLs, immutable caching for `/_astro/*` and basic security headers. The lead form goes
through the Vercel Function `api/lead.js` (`POST /api/lead`), so the bot token stays on the server.

1. vercel.com → *Add New → Project* → import `FathullaLatipov/itboost` (production branch:
   `master`). Framework preset: Astro (detected automatically).
2. *Settings → Environment Variables* (Production + Preview) — exactly two, both server-only:

   | Name | Value | Notes |
   |---|---|---|
   | `TG_BOT_TOKEN` | bot token | mark as *Sensitive* |
   | `TG_CHAT_ID` | chat id | |

   Nothing with a `PUBLIC_` prefix is needed — delete any `PUBLIC_*` variables left from earlier
   setups (`PUBLIC_*` values are bundled into the browser JS; Vercel warns about exactly this).
   Changing variables requires a redeploy (*Deployments → … → Redeploy*).
3. Check the function after deploy: `curl -i https://<your-domain>/api/lead` → `405
   {"ok":false,"error":"method_not_allowed"}` (not 404). Then send one real lead from the site.
   Errors are in *Project → Logs* (`[itboost-lead] …`).
4. *Settings → Domains* → add `itboost.uz` and `www.itboost.uz` (redirect www → apex). At your
   DNS provider set: `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com` (Vercel shows the
   exact records). SSL is issued automatically.
5. `public/.htaccess` and `public/api/lead.php` are cPanel-only; the Vercel build removes
   `dist/api` so the PHP file is not published there.

---

## 1. Environment

The site itself needs **no** environment variables: the form always posts to `/api/lead`, a
server-side proxy that forwards leads to Telegram. Only that proxy needs two server-side values
(see `.env.example`):

| Variable | Meaning |
|---|---|
| `TG_BOT_TOKEN` | Bot token (aliases: `ITBOOST_TG_TOKEN`) |
| `TG_CHAT_ID` | Chat that receives leads (alias: `ITBOOST_TG_CHAT_ID`) |

- Vercel: project environment variables (section 0).
- cPanel: PHP environment variables or `~/itboost-lead-config.php` (section 4).
- Locally, `astro dev` cannot run `/api/lead`, so the form shows its error state; test sending on
  a Vercel preview deployment (or `vercel dev`, which reads `.env`).

If the proxy is not configured it answers `500 not_configured` and logs
`[itboost-lead] not configured…`; the form shows its error state (it never fails silently).

> **Security status.** The bot token used by the legacy site was published in its `index.html`
> (and remains in git history). It must be considered compromised — rotate it (section 4, step 1)
> and put only the new token into `TG_BOT_TOKEN`.

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

Sanity check — the bundle must never contain anything shaped like a bot token:

```bash
grep -rlE "[0-9]{8,10}:[A-Za-z0-9_-]{30,}" dist/   # must print nothing
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
form only talks to its own origin: `connect-src 'self'`).

## 4. Token rotation + proxy on cPanel

On cPanel the form posts to `https://itboost.uz/api/lead`, which `.htaccess` rewrites to
`public/api/lead.php`. The script keeps the token on the server and adds an origin check,
validation, a honeypot and a rate limit (5 leads / 10 min / IP).

1. **Revoke the leaked token.** Telegram → @BotFather → `/mybots` → choose the bot →
   *API Token* → *Revoke current token*. Copy the new token.
2. **Store the new token outside the web root.** In File Manager create
   `/home/<cpanel-user>/itboost-lead-config.php` (the folder *above* `public_html`):

   ```php
   <?php
   return [
       'token'   => '1234567890:NEW-TOKEN-FROM-BOTFATHER',
       'chat_id' => '123456789',
   ];
   ```

   Permissions `600` (or `640`). Alternatively set `TG_BOT_TOKEN` and `TG_CHAT_ID` as environment
   variables for PHP — the script checks those first.
3. Build (`npm run build`) and upload `dist/` (section 3). Make sure `public_html/api/lead.php`
   and `public_html/.htaccess` are present.
4. **Test** (below), then send one real lead from the site and confirm it arrives.

On Vercel the same steps are: revoke the token, put the new one into `TG_BOT_TOKEN` in the
project settings, redeploy.

### Testing the proxy

The script could not be executed during development (no local PHP), so verify it on the host:

```bash
# wrong method → 405 {"ok":false,"error":"method_not_allowed"}
curl -i https://itboost.uz/api/lead

# no/foreign Origin → 403 forbidden_origin
curl -i -X POST https://itboost.uz/api/lead -H 'Content-Type: application/json' -d '{}'

# valid request (this sends a real message to the chat)
curl -i -X POST https://itboost.uz/api/lead \
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
