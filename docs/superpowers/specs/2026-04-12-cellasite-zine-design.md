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
Nav buttons preserve celladome.com placement exactly (measured at 1287×749):

| Button | Position (x, y) | Size (w × h) | Target |
|---|---|---|---|
| PROJECTS | 598, 4 | 103 × 69 | `/projects/` |
| GRAPHICS | 693, 18 | 103 × 58 | `/graphics/` |
| VIDEO | 790, 10 | 97 × 73 | `/video/` |
| ABOUT | 882, 11 | 111 × 73 | `/about/` |
| Logo | -67, -192 | 274 × 285 | `/` |

- Irregular y-offsets (4, 10, 11, 18) preserved — zine paste-up feel.
- Each button is a uniquely-shaped hand-drawn PNG from Portfolio.zip (not normalized).
- Logo bleeds off top-left at negative coords.
- Nav positioned absolutely via pixel values scaled with `clamp()` for larger viewports.
- Wordmarks use Georgia serif italic; body font is system-ui.

### Mobile (<768px)
- Logo stays visible (scaled ~60%, still bleeding off edge).
- **Tap logo** → full-screen nav overlay with buttons scattered in paste-up arrangement (CSS custom properties for per-button position/rotation).
- **Tap button** → navigates; **tap logo again** → closes overlay.
- **Easter egg:** `DeviceMotionEvent` shake (threshold `acceleration > 15 m/s²` sustained 200ms) triggers nav overlay with GSAP tumble-in physics (buttons "fall" into place with bounce easing). iOS 13+ requires `DeviceMotionEvent.requestPermission()`. Graceful degradation if denied.

### Scroll Model
Each page has `<main class="content-scroll">` that scrolls independently beneath pinned nav. Matches celladome.com's `content-scroll-wrapper` pattern. GSAP ScrollTrigger targets this inner container, not `document`.

### View Transitions (CSS, zero JS)
```css
@view-transition { navigation: auto; }
.nav-logo         { view-transition-name: logo; }
.nav-btn-projects { view-transition-name: nav-projects; }
.nav-btn-graphics { view-transition-name: nav-graphics; }
.nav-btn-video    { view-transition-name: nav-video; }
.nav-btn-about    { view-transition-name: nav-about; }
```

Cross-document View Transitions API (Astro native). Logo persists, buttons morph independently, content cross-fades with directional slide (left/right based on nav order).

---

## Section 2: Animation Framework

Three layers, lightest to heaviest. Each layer has one purpose and runs independently.

### Layer 1 — View Transitions (0 KB JS, native CSS)
Page-to-page navigation morphing. Specified in Section 1.

### Layer 2 — Scroll-Driven (GSAP + CSS scroll-timeline)
Within-page choreography:

- **Home:** Particle portrait → bio → skills → project carousel (already built in commit `346e25a`).
- **Projects:** Parallax images, pull-quote slides, layered depth on scroll.
- **Graphics:** Masonry stagger-in on viewport enter, rotating cards.
- **About:** Resume timeline draws on scroll, bio reveal, skills stagger.

Native CSS `scroll-timeline` where supported; GSAP ScrollTrigger fallback. Lenis smooth scroll scoped to inner `content-scroll-wrapper`.

### Layer 3 — Interaction Responses (user-triggered)

| Interaction | Behavior |
|---|---|
| Nav hover | 2° rotate wobble (GSAP `quickTo`) |
| Grid hover | Scale + drop shadow on project/gallery cards |
| Lightbox | Click image → morph to fullscreen via View Transitions |
| Audio | Web Audio API, opt-in per project, fade in/out |
| Cursor | Hand-drawn `cursor: url()` from Portfolio.zip assets |
| Audio toggle | Sticky mute/unmute indicator, persists across pages |

### Performance Rules
- **`transform` + `opacity` only** for GSAP (GPU-accelerated, no layout thrash).
- **`prefers-reduced-motion`** disables Layer 2 + Layer 3; Layer 1 native fade remains.
- **Lazy-init** ScrollTriggers per page, not global.
- **Audio opt-in** — no autoplay; user must click unmute.
- **Lenis scoped** to inner wrapper, not full document.

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
- Single-column reflow. No horizontal scroll. Stacked grids.
- Images full-width; 400w srcset variant served, lazy-loaded.
- Typography scales 10-15% down, tighter line-height. Georgia italic wordmarks preserved.
- Layer 2 animations reduced; Layer 3 disabled (no hover on touch). Layer 1 (View Transitions) intact.
- Nav overlay via logo tap or device shake (see Section 1).

### What Mobile Does NOT Do
- No custom cursor (touch input).
- No hover wobble / hover scale.
- No auto-playing project audio (preserve data).
- No parallax depth effects (perf + motion sickness).
- No multi-column Readymag pixel-fidelity — reflow wins over pixel-match.

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

### PR Preview Loop

1. Copilot opens PR from an Issue → Cloudflare Pages auto-builds.
2. Preview URL posted as PR comment (e.g. `https://<feature>.celladome.pages.dev`).
3. Cella opens preview on phone, reviews, merges or opens follow-up.
4. On merge to `main` → production deploy to `celladome.com`.

### Domain & DNS Cutover

**Before cutover:**
- `celladome.com` points to Readymag (live).
- `celladome.pages.dev` serves new Astro site.
- Cella tests on real devices under preview URLs.

**Cutover day:**
- Point `celladome.com` DNS → Cloudflare Pages.
- Cloudflare handles SSL automatically.
- `celladome.pages.dev` still works as staging alias.
- Readymag can be archived or kept as backup.

### Repo & CI

- **Repo:** `github.com/ashrocket/cellasite` (already set up).
- **Cloudflare project:** linked to repo, auto-deploys on `main` push + PR previews.
- **Secrets:** none required initially (static SSG). Add later if analytics/forms are added.
- **GitHub Actions:** minimal — Cloudflare handles builds. Actions only for lint and type-check on PR.

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
