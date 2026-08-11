# imsurajkr.github.io

Personal site, resume and browser-based DevOps tools for **Suraj Kumar** — Senior Platform &
DevOps Engineer.

**Live:** <https://imsurajkr.github.io>

Built with [Astro](https://astro.build), deployed to GitHub Pages by GitHub Actions.

---

## Design system — "Control Plane"

The site is styled as an engineering specification document rather than a brochure.

- **Typography** — IBM Plex Sans (UI and prose) + JetBrains Mono (all technical metadata:
  terminal, metrics, stack chips, section indices).
- **Colour** — accents are *semantic* and rationed; most of the page is neutral graphite.
  `--signal` (azure) = interaction, `--health` (emerald) = status and outcomes,
  `--guard` (amber) = security and compliance. All four neutral text tokens meet WCAG AA
  against their surfaces in both themes.
- **Surfaces** — 6px radii, 1px hairline borders, no drop shadows. Elevation comes from
  border brightness and a background step.
- **Section headers** — drawn like dimension lines on a technical drawing: index and label
  sitting on a hairline rule. Case-study panels carry CAD-style corner registration marks.
- **Motion** — scroll reveal (8px + fade, staggered), a typing terminal, metric count-up and
  hover rules. No scale transforms. Everything honours `prefers-reduced-motion`.

Tokens live at the top of `src/styles/global.css`; changing the palette or scale there
propagates everywhere.

---

## What's here

| Route | Contents |
| --- | --- |
| `/` | Resume — live terminal hero, focus areas, engineering case studies, experience, technical depth, writing, contact |
| `/about` | Longer bio, working principles, career timeline |
| `/tools` | Six client-side DevOps tools (see below) |
| `/blog` | 10 posts migrated from the previous Jekyll site, original URLs preserved |
| `/contact` | Contact details and a `mailto:` compose form |
| `/privacy` | Privacy policy |
| `/rss.xml` | Blog feed |
| `/sitemap-index.xml` | Generated sitemap |

### Tools

All six run entirely in the browser — no backend, no network calls, nothing uploaded.

- **Visual Subnet Calculator** — divide/join CIDR blocks, shareable URL state, CSV export
- **Base64 Encoder / Decoder** — UTF-8 safe, URL-safe variant
- **JWT Decoder** — header, claims, expiry (decode only; signatures are not verified)
- **YAML ↔ JSON Converter** — multi-document YAML, key sorting
- **Cron Expression Explainer** — plain-English description plus next 10 run times
- **UUID & Password Generator** — Web Crypto, rejection sampling, entropy readout

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run build:ci` | Build without the typecheck step (CI runs `check` separately) |
| `npm run check` | `astro check` — typecheck `.astro` and `.ts` files |
| `npm run preview` | Serve the production build locally |

## Project layout

```
src/
  data/           site.ts, resume.ts, tools.ts — content lives here, not in markup
  content/blog/   migrated posts (Astro content collection)
  layouts/        BaseLayout, ToolLayout
  components/     Nav, Footer, Hero, PostCard, BaseHead (SEO + JSON-LD), …
  pages/          one file per route
  styles/         global.css (design tokens), tools.css
public/           static assets served as-is (images, robots.txt, favicon)
```

Adding a tool means one entry in `src/data/tools.ts` plus a page at
`src/pages/tools/<slug>.astro` — the index, related-tool links and sitemap all derive from
that list. Resume content is edited in `src/data/resume.ts`; no markup changes needed.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which typechecks, builds, verifies
the expected pages exist (including every legacy blog permalink), and publishes to GitHub Pages.
Pull requests run `.github/workflows/ci.yml`.

**One-time setup:** in the repository settings, under **Pages → Build and deployment**, set
**Source** to **GitHub Actions**.

## Migration note

This site previously ran on Jekyll (WhatATheme). Blog permalinks from that era —
`/blog/:title` — are preserved exactly, so existing links and search results keep working.
