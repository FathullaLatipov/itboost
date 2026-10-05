# ITBoost Design System

Version 2.0. This is the reference for anyone touching the site's UI. Tokens live in
`src/styles/tokens.css`, global primitives in `src/styles/base.css`.

## 1. Concept — "Engineered clarity"

ITBoost builds digital systems, so the site should feel *engineered*: precise grids, hairline
rules, mono metadata, one confident accent. The **hexagon + code chevrons** from the logo is the
only graphic motif — used as nodes, lattice and markers. No stock imagery, no purple gradients,
no glassmorphism stacks, no decorative blobs.

Every element must serve **brand, UX, trust or conversion**. If it doesn't, remove it.

## 2. Colour

Brand source (sampled from the logo): Boost Blue `#48AAFF`, Navy `#20304E`, Mist `#EEEEEE`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#070D1A` ink | `#EDEEF0` paper | section background |
| `--bg-elevated` | `#0B1426` | `#F7F8F9` | raised bands |
| `--surface` / `--surface-2` | `#101A2E` / `#16223A` | `#FFF` / `#E2E4E8` | panels, cards |
| `--fg` | `#EEF1F5` | `#0B1324` | primary text (17:1 / 16:1) |
| `--fg-muted` | `#9AA4B5` | `#4B5567` | body secondary (≥6.4:1) |
| `--fg-faint` | `#808B9E` | `#5F6779` | metadata only |
| `--line` / `--line-strong` | 10% / 20% white | 12% / 24% ink | hairlines |
| `--accent` | `#48AAFF` | `#48AAFF` | fills, dots, active states |
| `--accent-text` | `#7CC4FF` | `#0B63C4` | accent-coloured text (AA) |
| `--accent-soft` | 12% blue | 14% blue | tinted backgrounds |
| `--on-accent` | `#06101F` | `#06101F` | text on blue (7.7:1) |
| `--success` | mint `#6EE7B7` | `#0F8A5F` | status dot, form success only |
| `--danger` | `#FF7A7A` | `#C52B2B` | form errors only |

**Rules**
- Themes are switched per section with `data-theme="dark" | "light"`. Never hardcode hex in
  components — use semantic tokens so a section can flip theme.
- Blue is an *accent*: max ~10% of any viewport. Never blue body text on blue-tinted surfaces.
- Never put text on `--accent` other than `--on-accent`.
- Section rhythm on the home page: **dark** (hero) → **light** (about, services) → **dark** (AI,
  work) → **light** (stack, process) → **dark** (team, contact, footer).

## 3. Typography

One family: **Onest Variable** (Cyrillic + Latin, self-hosted via `@fontsource-variable/onest`).
System mono stack only for metadata.

| Role | Class | Size (fluid 320→1600px) | Weight | Tracking |
|---|---|---|---|---|
| Display | `.t-display` | 2.6rem → 7.25rem | 600 | -0.045em, lh 0.98 |
| Section heading | `.t-h2` | 2rem → 4.25rem | 600 | -0.03em, lh 1.05 |
| Subheading | `.t-h3` | 1.3rem → 1.75rem | 600 | -0.015em |
| Card title | `.t-h4` | 1.1rem → 1.25rem | 600 | -0.015em |
| Lead | `.t-lead` | 1.06rem → 1.375rem | 400 | muted colour |
| Body | default | 1rem / 1.6 | 400 | — |
| Meta | `.t-meta` | 0.75rem mono uppercase | 400 | +0.08em |

- Headings use `text-wrap: balance`; paragraphs `text-wrap: pretty`.
- Max measure for body copy: ~65ch (`--container-text: 46rem`).
- Display text must never overflow at 320px — long Russian/Uzbek words: check `overflow-wrap`.

## 4. Space, layout, shape

- Spacing scale `--space-1…10` (0.25rem → 8rem). Section padding `--section-y` (4.5 → 9.5rem).
- Container: `.container` = 1320px + fluid gutter (`--gutter` 16px → 48px). `.container--wide` 1560px.
- 12-column grid utility `.grid-12`; columns collapse to 1 below 768px unless designed otherwise.
- Radius: `--radius-xs 4` (inputs, small chips) · `--radius-sm 8` (cards) · `--radius-md 14`
  (media frames) · `--radius-lg 22` (rare) · `--radius-pill` (buttons, badges). Prefer small radii.
- Borders over shadows. Shadows (`--shadow-1/2`) only for floating elements (chips, dialogs).
- Breakpoints: `480 · 768 · 1024 · 1280 · 1600`. Verify 320 · 375 · 390 · 414 · 768 · 1024 ·
  1280 · 1440 · 1920 · 2560.

## 5. Motion

| Level | What | Duration / easing |
|---|---|---|
| L1 | hover, focus, colour, icon nudge | `--dur-1` 160ms / `--dur-2` 320ms, `--ease-out` |
| L2 | section reveals, staggered lists, counters, line draws | `--dur-3` 700ms, `--ease-out`, stagger 70ms |
| L3 | hero visual, AI data-flow, process timeline | `--dur-4` 1100ms or continuous, component-owned |

- Animate **only `transform` and `opacity`** (and `clip-path` for masks). No layout properties.
- Reveal API: add `data-reveal` (`up` default, `fade`, `scale`, `mask`) and `style="--i:N"` for
  stagger. Headlines: put `data-split` on the heading and render `<SplitText text="…" />` inside.
  `src/scripts/reveal.ts` toggles `.is-visible` once.
- Everything respects `prefers-reduced-motion` (global CSS kill-switch + scripts check
  `prefersReducedMotion()`). Canvas/rAF loops must pause when off-screen (`observeVisibility`).
- Mobile (<1024px or coarse pointer): no custom cursor, no magnetic, no tilt, lighter hero.

## 6. Components

| Component | Path | Notes |
|---|---|---|
| `Button` | `ui/Button.astro` | `variant` primary / secondary / ghost, `size` md / lg, `icon`, `magnetic`, `external` |
| `SectionHeading` | `ui/SectionHeading.astro` | `index` ("02"), `eyebrow`, `title`, `lead`, slot `aside` |
| `SplitText` | `ui/SplitText.astro` | word mask reveal, accessible |
| `Badge` | `ui/Badge.astro` | outline / soft / mono |
| `Icon` | `ui/Icon.astro` | inline stroke icons |
| `BrandMark` | `ui/BrandMark.astro` | logo hexagon as SVG |
| `Logo` | `ui/Logo.astro` | optimized raster logo |

**Cursor hooks** (desktop only, see `layout/Cursor.astro`): `data-cursor="cta"` (buttons — set
automatically by `Button`), `data-cursor="view"` + `data-cursor-label="…"` (project media),
`data-cursor="hide"` (inputs).

## 7. Content & i18n

- All copy lives in `src/content/*.ts` as `Localized<T>` (`ru` + `uz` must both exist — enforced
  by TypeScript). Components receive `lang` and read `content[lang]`.
- Russian is served at `/`, Uzbek at `/uz/` (separate static pages with hreflang).
- **Never invent** clients, numbers, testimonials or technologies. Stats are computed from data
  (`projects.length`, `services.length`, `team.length`).

## 8. Accessibility checklist

- Semantic landmarks: one `h1` (hero), `h2` per section, lists for lists.
- Every interactive element reachable by keyboard with a visible `:focus-visible` ring.
- Hover-only reveals must also open on focus / tap (`aria-expanded` on toggles).
- Images: meaningful `alt`; decorative SVG `aria-hidden`.
- Touch targets ≥ 44px. Body text ≥ 16px.
