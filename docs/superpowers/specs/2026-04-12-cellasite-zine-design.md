# Cellasite — Zine Design Spec

**Date:** 2026-04-12
**Author:** Ashley Raiteri (@ashrocket) with Claude
**Repo:** github.com/ashrocket/cellasite
**Status:** Approved — ready for implementation planning

---

## Summary

Rebuild of Cella Raiteri's portfolio (`celladome.com`, currently on Readymag) into a self-hosted Astro 6 SSG. Cella is a graphic designer / creative director in NYC — not a developer. The site must feel hand-made, collaged, zine-like, matching her existing aesthetic. She updates it from her phone via GitHub Issues + Copilot, with Readymag as the visual source of truth.

**Audience:** music industry clients (labels, artists, venues), potential employers (full-time + freelance), press/editorial.

**Design approach: "The Zine"** — page-based with View Transitions API. Each section (Projects, Graphics, Video, About) is its own page, like flipping through a printed zine. GSAP drives scroll-driven animation within pages. Hand-drawn PNG nav buttons persist across pages via View Transitions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Astro 6 (SSG) |
| Animation | GSAP + ScrollTrigger, CSS scroll-timeline, View Transitions API |
| Scroll | Lenis (smooth scroll, scoped to inner wrapper) |
| Audio | Web Audio API (opt-in, per-project) |
| Content | Content Collections (YAML metadata) + bespoke `.astro` page components |
| Hosting | Cloudflare Pages (with PR preview deploys) |
| CMS | Readymag (design source of truth) + GitHub Issues + Copilot (sync agent) |

---

## Section 1: Navigation & Visual Shell

**Principle:** Fixed outer frame wraps every page. Inner content scrolls independently.

### Desktop (≥768px)

Nav buttons preserve celladome.com placement (audited at 1287×749 viewport).

**Positioning strategy: center-anchor with fixed pixel margin-left.** Matches how Readymag itself renders the nav. Each button is anchored to viewport center, then shifted by a fixed pixel offset. No `clamp()`, no `vw`, no responsive scaling — buttons stay their native PNG size, y-offsets stay fixed, horizontal spacing stays constant at any viewport width.

```css
.nav-btn-projects {
  position: fixed;
  left: 50%;
  top: 4px;
  margin-left: 6px;       /* center-relative offset */
  width: 103px;
  height: 69px;
}
```

Margin-left values derived from the audit (button center = viewport center + margin-left):

| Button | Audit x,y | Size w × h | y (top) | margin-left |
|---|---|---|---|---|
| PROJECTS | 598, 4 | 103 × 69 | 4px | +6 |
| GRAPHICS | 693, 18 | 103 × 58 | 18px | +101 |
| VIDEO | 790, 10 | 97 × 73 | 10px | +195 |
| ABOUT | 882, 11 | 111 × 73 | 11px | +294 |
| Logo | -67, -192 | 274 × 285 | -192px | -573.5 |

**Viewport verification** — rightmost button (ABOUT) edge position vs. viewport width:

| Viewport | ABOUT right edge | Clearance |
|---|---|---|
| 768px | 734px | 34px margin ✓ |
| 1024px | 862px | 162px ✓ |
| 1287px | 993px | matches design ✓ |
| 1440px | 1075px | ✓ |
| 1920px | 1016px (centered further) | ✓ |

At 768px there's 34px clearance on the right — tight but safe. Below ~720px, ABOUT would begin to clip — that's already below the 768px mobile breakpoint where the inline nav collapses into the logo-tap overlay.

- Irregular y-offsets (4, 10, 11, 18) preserved — zine paste-up feel.
- Each button is a uniquely-shaped hand-drawn PNG from Portfolio.zip (not normalized).
- Logo bleeds off top-left at negative coords (top: -192px, margin-left: -573.5px).
- Wordmarks use Georgia serif italic; body font is system-ui.

### Mobile (<768px)
- Logo stays visible (scaled ~60%, still bleeding off edge).
- **Tap logo** → full-screen nav overlay with buttons scattered in paste-up arrangement (CSS custom properties for per-button position/rotation).
- **Tap button** → navigates; **tap logo again** → closes overlay.
- **Easter egg:** `DeviceMotionEvent` shake (threshold `acceleration > 15 m/s²` sustained 200ms) triggers nav overlay with GSAP tumble-in physics (buttons "fall" into place with bounce easing). iOS 13+ requires `DeviceMotionEvent.requestPermission()`. Graceful degradation if denied.

### Scroll Model

`<main class="content-scroll">` on every page scrolls independently beneath the pinned nav (matches celladome.com's `content-scroll-wrapper`). GSAP ScrollTrigger and Lenis both target this inner container, not `document`.

### View Transitions (CSS, zero JS) with Progressive Fallback

**Primary strategy:** Native cross-document View Transitions.

```css
@view-transition { navigation: auto; }

.nav-logo         { view-transition-name: logo; }
.nav-btn-projects { view-transition-name: nav-projects; }
.nav-btn-graphics { view-transition-name: nav-graphics; }
.nav-btn-video    { view-transition-name: nav-video; }
.nav-btn-about    { view-transition-name: nav-about; }
```

Each button has a **unique** transition name — PROJECTS only morphs with PROJECTS on the next page. No cross-size morphing between differently-shaped PNGs. The identity transition (same element, same position, same size) is effectively visually invisible — which is what we want for persistent nav elements.

**Browser support (as of 2026-04):**

| Browser | Cross-document View Transitions | Behavior |
|---|---|---|
| Chrome/Edge 126+ | ✓ supported | Full morphing experience |
| Safari 18.2+ | ✓ supported | Full morphing experience |
| Firefox | Not yet | Graceful fallback (see below) |
| Safari <18.2 | Not supported | Graceful fallback |

**Fallback — no JS polyfill, no added weight.** Browsers without support skip the CSS at-rules entirely. Navigation works normally — pages load with a brief default transition. The hand-drawn nav and visual design still look identical; only the morph animation is absent. This preserves Layer 1's "0 KB, native CSS" contract.

```css
@supports not (view-transition-name: logo) {
  /* Any view-transition-specific visual cues go here, e.g.
     fallback hover animation to mimic persistence */
}
```

### Capture-Region Safeguards

For the logo's off-screen bleed (`top: -192px`, `margin-left: -573.5px`), browser behavior when capturing elements partially outside the viewport is implementation-defined. Mitigations:

1. **Deterministic positioning.** Logo position is identical on every page (same CSS, same computed values). Even if capture behavior differs across browsers, start and end frames on a given browser are identical → transition is a visual no-op. Safe regardless of how any one browser handles the bleed.

2. **`contain: paint` on the nav container** — tells the browser the paint region is bounded, reducing surprises during snapshot capture.

3. **Opt-out for nested elements** — any decorative children that shouldn't participate get `view-transition-name: none` to prevent conflicts.

4. **Manual verification** — QA pass at cutover time on Chrome, Edge, Safari 18.2+, and mobile Safari. Firefox verified to fall back gracefully (no visual glitch, just no morph).

---

## Section 2: Animation Framework

Three layers, lightest to heaviest. Each has one purpose and runs independently.

**Layer 1 — View Transitions.** Page-to-page navigation morphing. Spec in Section 1.

**Layer 2 — Scroll-Driven (GSAP + CSS `scroll-timeline`).** Within-page choreography driven by scroll position. Uses native CSS `scroll-timeline` where supported, GSAP ScrollTrigger fallback.

- **Home:** Particle portrait → bio → skills → project carousel (already built in commit `346e25a`).
- **Projects:** Parallax images, pull-quote slides.
- **Graphics:** Masonry grid with entry animations on viewport enter.
- **About:** Resume timeline and bio reveal on scroll.

**Layer 3 — Interaction Responses.** User-triggered effects.

| Interaction | Behavior |
|---|---|
| Nav hover | 2° rotate wobble |
| Grid hover | Scale + drop shadow on cards |
| Lightbox | Click image → morph to fullscreen via View Transitions |
| Project audio | Web Audio API, opt-in per project, sticky mute/unmute across pages |
| Cursor | Hand-drawn `cursor: url()` from Portfolio.zip assets |

### Performance Rules

- Animate `transform` and `opacity` only (GPU-accelerated, no layout thrash).
- `prefers-reduced-motion` disables Layer 2 and Layer 3; Layer 1 native fade remains.
- ScrollTriggers lazy-init per page, not global.
- Audio opt-in only — no autoplay.

---

## Section 3: CMS Pipeline & Content Model

**Model:** Readymag as CMS, one-way sync to Astro via Copilot. Design-driven development — each GitHub Issue is a prompt that evolves the Astro site closer to the Readymag design.

### Flow
1. Cella updates Readymag (visually, her comfort zone).
2. Opens GitHub Issue from phone — Readymag URL + natural language notes.
3. Copilot scrapes the Readymag page, diffs against current Astro site, opens a PR.
4. Cloudflare Pages posts preview URL on PR. Cella reviews on phone.
5. She merges, or opens a follow-up ticket with more direction. Multiple tickets converge on the design.

### Content Model (Hybrid — Approach C)

**Content Collections store structured metadata. Page layouts are bespoke.**

#### Metadata (structured data, powers index pages)

Pure YAML files — Astro 6 Content Collections support any data format (no markdown body needed for metadata-only collections).

```yaml
# src/content/projects/double-double-whammy.yaml
title: Double Double Whammy
slug: double-double-whammy
category: label-design
years: [2023, 2024, 2025]
artists: [Babehoven, Allegra Krieger, Truth Club, This Is Lorelei, Florist, Hovvdy, Lomelda]
thumbnail: /media/double-double-whammy/thumb.webp
description: Label identity & visual system
order: 1
```

#### Page layout (bespoke, matches Readymag exactly)

```astro
---
// src/pages/projects/double-double-whammy.astro
import ProjectShell from '~/layouts/ProjectShell.astro';
import { getEntry } from 'astro:content';
const project = await getEntry('projects', 'double-double-whammy');
---
<ProjectShell project={project.data}>
  <HeroCollage />
  <ArtistGrid />
  <PullQuote />
  <MotionGallery />
</ProjectShell>
```

The page imports its own metadata from the collection. Components inside are bespoke per project — no enforced template.

**Rationale:** Collection data powers index/gallery pages automatically (add a `.yaml` → grid updates). Detail pages stay fully bespoke for visual fidelity. Copilot workflow splits cleanly: metadata diff (small) + layout diff (visual).

### Collections

| Collection | Purpose |
|---|---|
| `projects` | Projects page items (Double Double Whammy, Halliday Carpender, Rose Bud Thorn, …) |
| `graphics` | Graphics page items (tour posters, merch, typography experiments) |
| `videos` | Video page items (Tucson Music Video, Babehoven WNYU Live, …) |

### AGENTS.md (at repo root)

Copilot's instruction manual:

- How to scrape Readymag pages (HTML structure, asset URLs, known layout patterns).
- Astro file structure — where metadata goes, where page components go.
- How to translate common Readymag layouts → Astro component patterns.
- Image handling rules (see below).
- PR conventions — title format, description template, preview URL reference.
- When to update metadata `.yaml` vs. page `.astro` vs. both.
- When to ask vs. act — if ambiguous, comment on Issue and wait.

### Image Pipeline

1. Copilot extracts images from the Readymag page.
2. Places originals in `public/media/<slug>/`.
3. Generates responsive WebP variants via `sharp`: 400w (mobile), 800w (tablet), 1600w (desktop).
4. Writes Astro `<Image>` references with srcset.
5. Commits optimized assets alongside code changes.

### Build-Time Image Verification

**Purpose:** Catch silent image failures (404s, CDN hiccups, typo'd paths) before they reach production.

A build-time check runs before `astro build` completes:

1. Walk `dist/` for every `<img>` `src` and `srcset` entry (and CSS `url()` references in built stylesheets).
2. `HEAD` request each URL (parallelized, with concurrency cap).
3. Any non-200 response fails the build with a list of broken URLs and the file each was referenced from.
4. Runs in both local `npm run build` and Cloudflare Pages build — failed build blocks PR merge.

Implementation: small Node script invoked via `"build": "astro build && node scripts/verify-images.mjs"`. Local image paths (served from `public/`) are also checked to catch missing asset commits.

### Content Pairing Check (metadata ↔ page)

**Purpose:** The two-file content model (`.yaml` metadata + `.astro` page) can silently drift if Copilot updates one without the other. A build-time pairing check enforces atomic updates.

1. For every `src/pages/projects/<slug>.astro`, verify that `src/content/projects/<slug>.yaml` exists.
2. For every `src/content/projects/<slug>.yaml`, verify that `src/pages/projects/<slug>.astro` exists (or the index page is intentionally handling it — a collection-to-page registry lists allowed exceptions).
3. Validate each `.yaml` against the Content Collection's Zod schema — missing required fields, wrong types, unknown keys all fail the build.
4. Parse `.astro` files for `getEntry('projects', '<slug>')` calls and verify the referenced slug exists in the collection.

Same check applies to `graphics` and `videos` collections. Runs as part of `scripts/verify-content.mjs` during build. Failure blocks merge.

### Automated Code Review Gate

**Purpose:** Cella reviews the visual preview, not the code. A layered set of automated checks substitutes for a human code reviewer.

Every PR triggers these, all must pass before merge is enabled:

| Check | Tool | Catches |
|---|---|---|
| Type check | `astro check` (TypeScript + Astro types) | Null props, wrong component args, missing imports, untyped collection access |
| Content schema | Zod schemas in `src/content/config.ts` | `.yaml` shape violations, required fields missing, invalid values |
| Lint | ESLint with Astro plugin + `eslint-plugin-jsx-a11y` | Common bugs, accessibility regressions (alt text, focus order, aria) |
| Format | Prettier (check mode) | Style drift |
| Content pairing | `scripts/verify-content.mjs` | Metadata/page drift (see above) |
| Image verification | `scripts/verify-images.mjs` | 404s, missing assets, CDN failures |
| Build | `astro build` | Anything that crashes the build pipeline |
| Visual smoke test | Playwright screenshot of 4 key pages (home, projects, graphics, about) compared against previous `main` deploy | Unexpected layout shifts, missing sections, broken rendering |

Runs in GitHub Actions on every PR. Cloudflare Pages build runs separately; both must succeed for merge.

**Screenshot baseline:** First deploy to `main` establishes baseline. Subsequent PRs diff against it with a 2% pixel-diff threshold (absorbs font-rendering noise). When Cella intentionally redesigns a page, she includes `update-baseline` in the PR title and the action refreshes the baseline instead of comparing.

### Fallback

Power-user path: direct code edits via GitHub web editor or local dev. Always available for hotfixes and fine-tuning Copilot's work.

---

## Section 4: Mobile & Responsive

**Desktop-first portfolio.** Mobile is functional, not broken. The zine is meant to be seen at full scale.

### Breakpoint

Single breakpoint at **768px**. Minimal complexity.

### Desktop (≥768px)
Full zine experience: inline nav row with irregular y-offsets, multi-column layouts, full animations, Web Audio, custom cursor.

### Mobile (<768px)

- Single-column reflow. No horizontal scroll.
- Images full-width; 400w srcset variant served, lazy-loaded.
- Typography scales 10-15% down; Georgia italic wordmarks preserved.
- Layer 1 View Transitions intact. Layer 2 parallax reduced. Layer 3 disabled entirely (no hover on touch, no custom cursor, no auto-audio).
- Nav overlay via logo tap or device shake (see Section 1).
- Reflow wins over pixel-match — no attempt at multi-column Readymag fidelity on small screens.

---

## Section 5: Deploy, Hosting & Cutover

### Hosting

**Cloudflare Pages**. Astro official adapter. PR preview URLs. Edge delivery.

| Config | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist/` |
| Node version | 20.x |
| Wrangler | `.wrangler/` directory already scaffolded |

### Preview & Deploy

Every PR gets a preview URL from Cloudflare Pages (posted as PR comment, e.g. `https://<feature>.celladome.pages.dev`). Cella reviews on phone, merges or iterates. Merge to `main` auto-deploys to `celladome.com`.

### Domain & DNS Cutover

- **Pre-cutover:** `celladome.com` stays on Readymag. New site lives at `celladome.pages.dev`. Cella tests on real devices via preview URLs.
- **Cutover:** Point `celladome.com` DNS → Cloudflare Pages. SSL handled automatically. `celladome.pages.dev` remains as staging alias. Readymag archived or retained as backup.

### Repo & CI

- Repo: `github.com/ashrocket/cellasite`. Cloudflare project linked, auto-deploys on `main` + PR previews.
- No secrets required (static SSG). Add later if analytics/forms are introduced.
- GitHub Actions runs the Automated Code Review Gate (Section 3) on every PR: all checks must pass before merge is enabled.

### Observability

- **Cloudflare Web Analytics** — free, privacy-respecting, no cookies. Enable from Cloudflare dashboard.
- **Build failures** — Cloudflare emails Cella on failed deploys. PR checks block merge on bad build.

### Rollback

- Cloudflare Pages keeps last ~20 deploys → one-click revert in dashboard.
- `git revert` on `main` → auto-redeploys previous state.
- Worst case: repoint DNS back to Readymag (Cella still owns the account).

---

## Existing Scaffold (what's already built)

Prior commits on `main`:
- `23b5555` Initial Astro 6 scaffold with GSAP, Lenis, Sass
- `f184eaf` Site structure: layout, nav, home page, section stubs
- `346e25a` Scroll-driven particle portrait effect

The rebuild replaces the stubs with the full Zine architecture. Home page's particle portrait (Layer 2 animation) stays.

---

## Assets

- **`Portfolio.zip`** / **`Portfolio_contents/`** — Cella's hand-drawn PNG assets (nav buttons, logo, cursor, textures). Source of truth for visual chrome. Implementation task: inventory and map each asset to a specific UI role (e.g. `projects-btn.png` → PROJECTS nav button).
- **Typography:** Body font is system-ui. Wordmarks (nav button labels, large display type) use Georgia serif italic. Any future custom fonts must be self-hosted (no Google Fonts — CF Pages edge delivery preferred).
- **Audio:** Per-project audio files live in `public/media/<slug>/audio.{mp3,ogg}`. Opt-in playback only. Cella supplies files per project as she chooses to include them.

---

## Out of Scope (this spec)

- Content authoring workflow beyond the Readymag → Copilot → PR loop (e.g., no direct CMS admin UI).
- Search functionality (can be added later via collection queries).
- i18n / localization.
- Analytics beyond Cloudflare Web Analytics.
- Contact forms (static SSG — forms would require Cloudflare Workers or third-party service; defer until Cella asks).
- Blog / editorial content (not requested; all content is portfolio work).
- Authenticated areas (no use case).

---

## Success Criteria

1. `celladome.com` visitors experience the Zine design — paste-up nav, view-transition morphs, scroll-driven animation, zine feel.
2. Cella can ship a content update end-to-end from her phone: open Issue with Readymag URL → Copilot PR → preview → merge → live.
3. Mobile visitors get a functional, reflowed experience with nav overlay + shake easter egg.
4. `prefers-reduced-motion` disables heavy animations; site remains usable.
5. Cutover from Readymag happens without broken links or downtime.
6. Cella retains full control — Readymag account untouched, DNS reversible, fallback edit paths available.
