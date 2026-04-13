# Cellasite Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working Astro 6 static site with the Zine nav shell, View Transitions, animation framework skeleton, and mobile overlay — deployable to a Cloudflare Pages preview URL. Content is minimal placeholder; full CMS comes in Plan 2, production deploy in Plan 3.

**Architecture:** Fixed nav shell with unique `view-transition-name` per button. Inner `content-scroll-wrapper` scrolls independently beneath pinned nav. Center-anchor + fixed-pixel margin-left positioning for buttons (matches Readymag's own rendering). Mobile uses logo-tap overlay + DeviceMotionEvent shake. Animation framework has three layers (View Transitions, scroll-driven, interaction responses) with `prefers-reduced-motion` disabling Layers 2 and 3.

**Tech Stack:** Astro 6, TypeScript strict, GSAP + ScrollTrigger, Lenis, SCSS, Playwright (visual smoke tests), Vitest (unit tests for position math and shake detection).

**Spec:** `docs/superpowers/specs/2026-04-12-cellasite-zine-design.md`

**Prior art:** scaffold at commits `23b5555`, `f184eaf`, `346e25a` — we inherit the particle portrait effect and SCSS setup but replace the nav and layout to match spec.

---

## File Structure

**New files:**
- `src/content/config.ts` — Zod schema stubs for `projects`, `graphics`, `videos` collections (full schemas in Plan 2)
- `src/components/Nav.astro` — desktop + mobile nav wrapper component
- `src/components/NavButton.astro` — single hand-drawn nav button
- `src/components/MobileNavOverlay.astro` — full-screen nav overlay
- `src/scripts/nav-overlay.ts` — tap-logo toggle + shake detection
- `src/scripts/lenis-init.ts` — Lenis init scoped to `content-scroll-wrapper`
- `src/scripts/nav-math.ts` — pure functions for button position math (unit-tested)
- `src/pages/video.astro` — stub page
- `src/pages/about.astro` — stub page
- `src/styles/view-transitions.scss` — `@view-transition` rule + transition names
- `src/styles/nav.scss` — nav button positioning
- `public/assets/nav/` — hand-drawn nav PNGs (extracted from `Portfolio_contents/`)
- `public/assets/logo/` — hand-drawn logo PNG
- `tests/unit/nav-math.test.ts` — Vitest unit tests
- `tests/e2e/foundation.spec.ts` — Playwright smoke tests
- `playwright.config.ts`
- `vitest.config.ts`
- `.eslintrc.cjs`
- `.prettierrc`
- `tsconfig.json` updates (strict mode)

**Modified files:**
- `src/layouts/BaseLayout.astro` — full rewrite
- `src/pages/index.astro` — wrap in new shell (keep particle portrait hero)
- `src/pages/projects.astro` — replace with stub matching new layout
- `src/pages/graphics.astro` — replace with stub matching new layout
- `astro.config.mjs` — add integrations (Vitest, check)
- `package.json` — add dependencies and scripts

**Renamed/removed:**
- `src/pages/motion.astro` → `src/pages/video.astro` (new file; old deleted)
- `src/pages/creative-direction.astro` → `src/pages/about.astro` (new file; old deleted)

**Out of scope for this plan (covered in Plan 2 or 3):**
- Content population (all projects/graphics/videos data)
- Sharp image pipeline and responsive variants
- AGENTS.md for Copilot
- Build-time image URL verification
- Build-time content pairing check
- GitHub Actions review gate
- Cloudflare Pages project setup
- DNS cutover

---

## Task 1: Dev tooling setup (TypeScript strict, Prettier, ESLint)

**Files:**
- Modify: `tsconfig.json`
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`
- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

```bash
cd /Users/ashleyraiteri/ashcode/cellasite
npm install --save-dev \
  typescript \
  @astrojs/check \
  prettier \
  prettier-plugin-astro \
  eslint \
  eslint-plugin-astro \
  eslint-plugin-jsx-a11y \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

- [ ] **Step 2: Update `tsconfig.json` to extend Astro strict**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"]
    }
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    { "files": "*.astro", "options": { "parser": "astro" } }
  ]
}
```

- [ ] **Step 4: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: { parser: '@typescript-eslint/parser', extraFileExtensions: ['.astro'] },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '.astro'],
};
```

- [ ] **Step 5: Add scripts to `package.json`**

Add under `"scripts"`:

```json
"check": "astro check",
"lint": "eslint . --ext .ts,.astro,.js",
"format": "prettier --check .",
"format:fix": "prettier --write ."
```

- [ ] **Step 6: Verify tooling**

Run: `npm run check && npm run lint && npm run format`
Expected: all three pass. Fix any issues before proceeding.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json .prettierrc .eslintrc.cjs package.json package-lock.json
git commit -m "Add TypeScript strict, Prettier, ESLint dev tooling"
```

---

## Task 2: Vitest + Playwright test setup

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/.gitkeep`
- Create: `tests/e2e/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev vitest @vitest/ui playwright @playwright/test
npx playwright install chromium webkit
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Install jsdom**

```bash
npm install --save-dev jsdom @types/jsdom
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { viewport: { width: 1287, height: 749 } } },
    { name: 'chromium-mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1287, height: 749 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 5: Add test scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 6: Create placeholder test directories**

```bash
mkdir -p tests/unit tests/e2e
touch tests/unit/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 7: Verify Vitest runs (with no tests yet, it should exit cleanly)**

Run: `npm run test`
Expected: "No test files found" (exit 0 or 1 depending on version — both acceptable here; it should not crash).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests package.json package-lock.json
git commit -m "Add Vitest and Playwright test infrastructure"
```

---

## Task 3: Nav math module with unit tests (TDD)

**Purpose:** Extract pure functions for nav button positioning so they can be tested independently of DOM. These compute `margin-left` values from the audit data and verify viewport fit.

**Files:**
- Create: `src/scripts/nav-math.ts`
- Create: `tests/unit/nav-math.test.ts`

- [ ] **Step 1: Write failing tests**

Write to `tests/unit/nav-math.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  computeMarginLeft,
  computeButtonRightEdge,
  NAV_BUTTONS,
  DESIGN_VIEWPORT_WIDTH,
} from '~/scripts/nav-math';

describe('nav-math', () => {
  describe('computeMarginLeft', () => {
    it('computes +6 for PROJECTS (audit x=598, w=103)', () => {
      expect(computeMarginLeft(598, 103)).toBe(6);
    });

    it('computes +101 for GRAPHICS (audit x=693, w=103)', () => {
      expect(computeMarginLeft(693, 103)).toBe(101);
    });

    it('computes +195 for VIDEO (audit x=790, w=97)', () => {
      expect(computeMarginLeft(790, 97)).toBe(195);
    });

    it('computes +294 for ABOUT (audit x=882, w=111)', () => {
      expect(computeMarginLeft(882, 111)).toBe(294);
    });

    it('computes -573.5 for logo bleed (audit x=-67, w=274)', () => {
      expect(computeMarginLeft(-67, 274)).toBe(-573.5);
    });
  });

  describe('computeButtonRightEdge', () => {
    it('ABOUT right edge at 768px = 734px (34px clearance)', () => {
      const about = NAV_BUTTONS.find((b) => b.id === 'about')!;
      expect(computeButtonRightEdge(about, 768)).toBe(734);
    });

    it('ABOUT right edge at 1287px = 993px (matches design)', () => {
      const about = NAV_BUTTONS.find((b) => b.id === 'about')!;
      expect(computeButtonRightEdge(about, 1287)).toBe(993);
    });
  });

  describe('NAV_BUTTONS', () => {
    it('has 4 buttons in nav order', () => {
      expect(NAV_BUTTONS.map((b) => b.id)).toEqual([
        'projects',
        'graphics',
        'video',
        'about',
      ]);
    });

    it('design viewport width is 1287', () => {
      expect(DESIGN_VIEWPORT_WIDTH).toBe(1287);
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test tests/unit/nav-math.test.ts`
Expected: FAIL with "Cannot find module '~/scripts/nav-math'"

- [ ] **Step 3: Create `src/scripts/nav-math.ts` with minimal implementation**

```ts
/**
 * Nav button position math.
 *
 * The nav is rendered using Readymag's own approach: each button is anchored
 * to the viewport center (`left: 50%`) with a fixed pixel `margin-left` offset.
 * Audit coords were captured at a 1287×749 viewport.
 */

export const DESIGN_VIEWPORT_WIDTH = 1287;
export const DESIGN_VIEWPORT_CENTER = DESIGN_VIEWPORT_WIDTH / 2; // 643.5

export interface NavButton {
  id: 'projects' | 'graphics' | 'video' | 'about';
  label: string;
  href: string;
  auditX: number;
  auditY: number;
  width: number;
  height: number;
  marginLeft: number;
}

/**
 * Compute margin-left for a button anchored at `left: 50%`.
 *
 * Button center in design coords: auditX + width / 2.
 * margin-left = button center − viewport center.
 */
export function computeMarginLeft(auditX: number, width: number): number {
  return auditX + width / 2 - DESIGN_VIEWPORT_CENTER;
}

/**
 * Compute the right edge of a button in pixels at a given viewport width.
 *
 * Button center = viewportWidth/2 + marginLeft.
 * Right edge   = center + width/2.
 */
export function computeButtonRightEdge(button: NavButton, viewportWidth: number): number {
  const center = viewportWidth / 2 + button.marginLeft;
  return center + button.width / 2;
}

export const NAV_BUTTONS: readonly NavButton[] = [
  {
    id: 'projects',
    label: 'PROJECTS',
    href: '/projects',
    auditX: 598,
    auditY: 4,
    width: 103,
    height: 69,
    marginLeft: computeMarginLeft(598, 103),
  },
  {
    id: 'graphics',
    label: 'GRAPHICS',
    href: '/graphics',
    auditX: 693,
    auditY: 18,
    width: 103,
    height: 58,
    marginLeft: computeMarginLeft(693, 103),
  },
  {
    id: 'video',
    label: 'VIDEO',
    href: '/video',
    auditX: 790,
    auditY: 10,
    width: 97,
    height: 73,
    marginLeft: computeMarginLeft(790, 97),
  },
  {
    id: 'about',
    label: 'ABOUT',
    href: '/about',
    auditX: 882,
    auditY: 11,
    width: 111,
    height: 73,
    marginLeft: computeMarginLeft(882, 111),
  },
] as const;

export const LOGO = {
  auditX: -67,
  auditY: -192,
  width: 274,
  height: 285,
  marginLeft: computeMarginLeft(-67, 274),
} as const;
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test tests/unit/nav-math.test.ts`
Expected: PASS — all assertions.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/nav-math.ts tests/unit/nav-math.test.ts
git commit -m "Add nav-math module with unit tests for button position math"
```

---

## Task 4: Content collection schema stubs

**Purpose:** Define Zod schemas so pages can type-check even before content is populated. Schemas are minimal in Plan 1; full field sets come in Plan 2.

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Create collection config**

Write to `src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const projectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  category: z.string().optional(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

const graphicSchema = z.object({
  title: z.string(),
  slug: z.string(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

const videoSchema = z.object({
  title: z.string(),
  slug: z.string(),
  year: z.number().optional(),
  role: z.string().optional(),
  thumbnail: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const collections = {
  projects: defineCollection({ type: 'data', schema: projectSchema }),
  graphics: defineCollection({ type: 'data', schema: graphicSchema }),
  videos: defineCollection({ type: 'data', schema: videoSchema }),
};
```

- [ ] **Step 2: Create empty collection directories**

```bash
mkdir -p src/content/projects src/content/graphics src/content/videos
```

- [ ] **Step 3: Verify Astro check**

Run: `npm run check`
Expected: 0 errors. (Empty collections are valid.)

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts src/content/graphics src/content/videos
git commit -m "Add Content Collection schema stubs for projects, graphics, videos"
```

---

## Task 5: Inventory Portfolio assets and stage nav/logo PNGs

**Purpose:** Portfolio.zip contains hand-drawn nav buttons and logo. Map each asset to a role, copy into `public/assets/` with semantic filenames.

**Files:**
- Create: `public/assets/nav/projects.png`
- Create: `public/assets/nav/graphics.png`
- Create: `public/assets/nav/video.png`
- Create: `public/assets/nav/about.png`
- Create: `public/assets/logo/logo.png`
- Create: `docs/asset-inventory.md`

- [ ] **Step 1: Inspect Portfolio_contents structure**

```bash
ls -la /Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/
ls -la "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/"
```

Expected: lists "Header", "Home Page Images", "Nara_s Room" directories. Header should contain nav button PNGs.

- [ ] **Step 2: Review Header directory contents**

```bash
ls -la "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/"
```

Identify which files are which buttons. If unclear, open them visually with `open "<path>"` to inspect.

- [ ] **Step 3: Create destination directories**

```bash
mkdir -p public/assets/nav public/assets/logo
```

- [ ] **Step 4: Copy nav buttons with semantic names**

Copy each identified asset to `public/assets/nav/<id>.png`. Example pattern (exact source filenames depend on what's in Header/):

```bash
cp "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/<projects-source>.png" public/assets/nav/projects.png
cp "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/<graphics-source>.png" public/assets/nav/graphics.png
cp "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/<video-source>.png" public/assets/nav/video.png
cp "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/<about-source>.png" public/assets/nav/about.png
cp "/Users/ashleyraiteri/ashcode/cellasite/Portfolio_contents/Porfolio Files/Header/<logo-source>.png" public/assets/logo/logo.png
```

If Portfolio_contents does not contain a clear match for a button, fall back to the current Readymag CDN asset for that button (URLs already captured during the scraping PoC — see Section 3 spec). Document the fallback in the inventory file.

- [ ] **Step 5: Document the mapping**

Write to `docs/asset-inventory.md`:

```markdown
# Asset Inventory

Source: `Portfolio_contents/Porfolio Files/`

## Nav

| Role | Source file | Destination | Size |
|---|---|---|---|
| PROJECTS | (filename) | `public/assets/nav/projects.png` | 103×69 |
| GRAPHICS | (filename) | `public/assets/nav/graphics.png` | 103×58 |
| VIDEO | (filename) | `public/assets/nav/video.png` | 97×73 |
| ABOUT | (filename) | `public/assets/nav/about.png` | 111×73 |
| Logo | (filename) | `public/assets/logo/logo.png` | 274×285 |

## Notes

- Dimensions are from the celladome.com nav audit (2026-04-05).
- Actual PNG dimensions may differ; CSS uses the audit dimensions.
- If the source image aspect ratio differs from the audit size, the CSS `width` and `height` still apply — the image will be scaled to the declared box.
```

Fill in actual filenames. Note any discrepancies.

- [ ] **Step 6: Verify files exist and open correctly**

```bash
ls -la public/assets/nav/ public/assets/logo/
open public/assets/nav/projects.png
```

All 5 files should be present, non-zero size, and open as images.

- [ ] **Step 7: Commit**

```bash
git add public/assets docs/asset-inventory.md
git commit -m "Stage hand-drawn nav and logo PNGs from Portfolio"
```

---

## Task 6: View Transitions CSS module

**Files:**
- Create: `src/styles/view-transitions.scss`

- [ ] **Step 1: Write the CSS**

Write to `src/styles/view-transitions.scss`:

```scss
/**
 * View Transitions — native cross-document transitions.
 *
 * Chrome/Edge 126+ and Safari 18.2+ morph persistent elements between pages.
 * Firefox and older Safari fall back to default navigation (no morph),
 * with no JS polyfill overhead.
 */

@view-transition {
  navigation: auto;
}

.nav-logo {
  view-transition-name: logo;
}

.nav-btn {
  &[data-nav-id='projects'] { view-transition-name: nav-projects; }
  &[data-nav-id='graphics'] { view-transition-name: nav-graphics; }
  &[data-nav-id='video']    { view-transition-name: nav-video; }
  &[data-nav-id='about']    { view-transition-name: nav-about; }
}

/* Bound the capture region to reduce browser-specific surprises with the
 * logo's off-screen bleed. */
.site-nav {
  contain: paint;
}

/* Fallback styling for browsers without View Transitions support. No JS
 * polyfill — pages just navigate normally. */
@supports not (view-transition-name: logo) {
  /* Intentionally empty. Native page load is acceptable degradation. */
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/view-transitions.scss
git commit -m "Add View Transitions CSS with unique names per button"
```

---

## Task 7: Nav button positioning CSS

**Files:**
- Create: `src/styles/nav.scss`

- [ ] **Step 1: Write the CSS**

Write to `src/styles/nav.scss`:

```scss
/**
 * Nav positioning.
 *
 * Each button is anchored at `left: 50%` and shifted by a fixed pixel
 * margin-left offset. Values derived from the nav audit (see
 * src/scripts/nav-math.ts). No clamp, no vw — buttons stay native size.
 */

.site-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 0; /* nav children use their own height; wrapper is layout-inert */
  z-index: 100;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.nav-logo {
  position: absolute;
  left: 50%;
  top: -192px;
  margin-left: -573.5px;
  width: 274px;
  height: 285px;
  display: block;

  img {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.nav-btn {
  position: absolute;
  left: 50%;
  display: block;
  text-decoration: none;

  img {
    width: 100%;
    height: 100%;
    display: block;
  }

  &[data-nav-id='projects'] {
    top: 4px;
    margin-left: 6px;
    width: 103px;
    height: 69px;
  }
  &[data-nav-id='graphics'] {
    top: 18px;
    margin-left: 101px;
    width: 103px;
    height: 58px;
  }
  &[data-nav-id='video'] {
    top: 10px;
    margin-left: 195px;
    width: 97px;
    height: 73px;
  }
  &[data-nav-id='about'] {
    top: 11px;
    margin-left: 294px;
    width: 111px;
    height: 73px;
  }
}

/* Hide inline desktop nav on mobile; logo stays visible. */
@media (max-width: 767px) {
  .nav-btn {
    display: none;
  }

  .nav-logo {
    width: 164px;  /* ~60% of 274 */
    height: 171px; /* ~60% of 285 */
    top: -115px;   /* ~60% of -192 */
    margin-left: -344.1px; /* ~60% of -573.5 */
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/nav.scss
git commit -m "Add nav button positioning CSS with center-anchor strategy"
```

---

## Task 8: NavButton component

**Files:**
- Create: `src/components/NavButton.astro`

- [ ] **Step 1: Write the component**

```astro
---
interface Props {
  id: 'projects' | 'graphics' | 'video' | 'about';
  label: string;
  href: string;
  isActive?: boolean;
}

const { id, label, href, isActive = false } = Astro.props;
---

<a
  href={href}
  class:list={['nav-btn', { 'nav-btn--active': isActive }]}
  data-nav-id={id}
  aria-label={label}
  aria-current={isActive ? 'page' : undefined}
>
  <img src={`/assets/nav/${id}.png`} alt={label} />
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NavButton.astro
git commit -m "Add NavButton component"
```

---

## Task 9: Nav component (desktop + logo)

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 1: Write the component**

```astro
---
import NavButton from './NavButton.astro';
import { NAV_BUTTONS } from '~/scripts/nav-math';

interface Props {
  activeId?: 'projects' | 'graphics' | 'video' | 'about' | 'home';
}

const { activeId = 'home' } = Astro.props;
---

<nav class="site-nav" aria-label="Primary">
  <a href="/" class="nav-logo" aria-label="CELLA — home">
    <img src="/assets/logo/logo.png" alt="CELLA" />
  </a>

  {NAV_BUTTONS.map((btn) => (
    <NavButton
      id={btn.id}
      label={btn.label}
      href={btn.href}
      isActive={activeId === btn.id}
    />
  ))}
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Nav.astro
git commit -m "Add site Nav component wiring logo + buttons from nav-math"
```

---

## Task 10: BaseLayout rewrite

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (full rewrite)

- [ ] **Step 1: Rewrite the layout**

Replace the entire file contents with:

```astro
---
import '../styles/global.scss';
import '../styles/view-transitions.scss';
import '../styles/nav.scss';
import Nav from '../components/Nav.astro';
import MobileNavOverlay from '../components/MobileNavOverlay.astro';

interface Props {
  title?: string;
  activePage?: 'home' | 'projects' | 'graphics' | 'video' | 'about';
}

const { title = 'CELLA', activePage = 'home' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="CELLA — Graphic Designer & Creative Strategist" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <Nav activeId={activePage} />
    <MobileNavOverlay />

    <main class="content-scroll">
      <slot />
    </main>

    <script>
      import { initNavOverlay } from '~/scripts/nav-overlay';
      import { initLenis } from '~/scripts/lenis-init';

      initNavOverlay();
      initLenis();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Verify the base layout compiles**

Run: `npm run check`
Expected: errors only for missing `MobileNavOverlay`, `nav-overlay.ts`, `lenis-init.ts` — those come in later tasks. Any other errors are bugs; fix before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "Rewrite BaseLayout with View Transitions nav shell"
```

---

## Task 11: Mobile nav overlay component

**Files:**
- Create: `src/components/MobileNavOverlay.astro`

- [ ] **Step 1: Write the component**

```astro
---
import { NAV_BUTTONS } from '~/scripts/nav-math';

/**
 * Full-screen paste-up nav overlay for mobile.
 * Hidden by default; toggled by logo tap or device shake.
 * Buttons scattered with per-button CSS custom properties for top/left/rotate.
 */

const scatter = [
  { id: 'projects', top: '18%', left: '12%', rotate: '-3deg' },
  { id: 'graphics', top: '38%', left: '45%', rotate: '2deg' },
  { id: 'video',    top: '58%', left: '8%',  rotate: '-1.5deg' },
  { id: 'about',    top: '72%', left: '40%', rotate: '1.8deg' },
] as const;

const byId = new Map(NAV_BUTTONS.map((b) => [b.id, b]));
---

<div
  id="mobile-nav-overlay"
  class="mobile-nav-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Navigation"
  hidden
>
  {scatter.map(({ id, top, left, rotate }) => {
    const btn = byId.get(id)!;
    return (
      <a
        href={btn.href}
        class="mobile-nav-btn"
        data-nav-id={id}
        style={`--top: ${top}; --left: ${left}; --rotate: ${rotate};`}
        aria-label={btn.label}
      >
        <img src={`/assets/nav/${id}.png`} alt={btn.label} />
      </a>
    );
  })}
</div>

<style lang="scss">
  .mobile-nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 99; /* below the logo (100), so tap-logo still works to close */
    background: rgba(18, 18, 18, 0.97);
    display: none;

    &[data-open='true'] {
      display: block;
    }
  }

  .mobile-nav-btn {
    position: absolute;
    top: var(--top);
    left: var(--left);
    transform: rotate(var(--rotate));
    display: block;

    &[data-nav-id='projects'] { width: 140px; height: 94px; }
    &[data-nav-id='graphics'] { width: 140px; height: 79px; }
    &[data-nav-id='video']    { width: 132px; height: 99px; }
    &[data-nav-id='about']    { width: 151px; height: 99px; }

    img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  @media (min-width: 768px) {
    .mobile-nav-overlay {
      display: none !important;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileNavOverlay.astro
git commit -m "Add mobile nav overlay component with paste-up scatter"
```

---

## Task 12: Nav overlay controller (tap-logo + shake easter egg)

**Files:**
- Create: `src/scripts/nav-overlay.ts`
- Create: `tests/unit/shake-detect.test.ts`

Extract shake detection as a pure function for testing.

- [ ] **Step 1: Write failing tests**

Write to `tests/unit/shake-detect.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ShakeDetector } from '~/scripts/nav-overlay';

describe('ShakeDetector', () => {
  it('does not fire below threshold', () => {
    let fired = false;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fired = true;
    });
    d.onMotion({ x: 5, y: 0, z: 0 }, 0);
    d.onMotion({ x: 5, y: 0, z: 0 }, 250);
    expect(fired).toBe(false);
  });

  it('fires when threshold sustained for 200ms', () => {
    let fired = false;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fired = true;
    });
    d.onMotion({ x: 20, y: 0, z: 0 }, 0);
    d.onMotion({ x: 20, y: 0, z: 0 }, 250);
    expect(fired).toBe(true);
  });

  it('resets when motion drops below threshold', () => {
    let fires = 0;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fires += 1;
    });
    d.onMotion({ x: 20, y: 0, z: 0 }, 0);
    d.onMotion({ x: 0, y: 0, z: 0 }, 100); // drops below
    d.onMotion({ x: 20, y: 0, z: 0 }, 150);
    d.onMotion({ x: 20, y: 0, z: 0 }, 500); // sustained again
    expect(fires).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test tests/unit/shake-detect.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the controller module**

Write to `src/scripts/nav-overlay.ts`:

```ts
/**
 * Nav overlay controller — tap logo to toggle, device shake to open.
 */

interface AccelSample {
  x: number;
  y: number;
  z: number;
}

interface ShakeConfig {
  thresholdMps2: number;
  sustainMs: number;
}

export class ShakeDetector {
  private sustainStart: number | null = null;

  constructor(
    private config: ShakeConfig,
    private onShake: () => void,
  ) {}

  onMotion(a: AccelSample, timestamp: number): void {
    const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

    if (magnitude < this.config.thresholdMps2) {
      this.sustainStart = null;
      return;
    }

    if (this.sustainStart === null) {
      this.sustainStart = timestamp;
      return;
    }

    if (timestamp - this.sustainStart >= this.config.sustainMs) {
      this.onShake();
      this.sustainStart = null;
    }
  }
}

export function initNavOverlay(): void {
  if (typeof document === 'undefined') return;

  const overlay = document.getElementById('mobile-nav-overlay');
  const logo = document.querySelector<HTMLAnchorElement>('.nav-logo');
  if (!overlay || !logo) return;

  const toggle = (open: boolean): void => {
    overlay.dataset['open'] = open ? 'true' : 'false';
    overlay.hidden = !open;
  };

  const isMobile = (): boolean => window.matchMedia('(max-width: 767px)').matches;

  // Logo tap on mobile toggles the overlay instead of navigating home.
  logo.addEventListener('click', (e) => {
    if (!isMobile()) return;
    e.preventDefault();
    const open = overlay.dataset['open'] !== 'true';
    toggle(open);
  });

  // Tap outside any button inside the overlay to close.
  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === overlay) toggle(false);
  });

  // Close overlay when a nav button inside it is activated (before navigation).
  overlay.querySelectorAll<HTMLAnchorElement>('.mobile-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggle(false));
  });

  // ESC closes overlay.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.dataset['open'] === 'true') toggle(false);
  });

  // Device shake — opens overlay on mobile. Requires user permission on iOS 13+.
  const shake = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
    if (isMobile()) toggle(true);
  });

  const attachMotion = (): void => {
    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      shake.onMotion({ x: a.x, y: a.y, z: a.z }, e.timeStamp);
    });
  };

  // Safari/iOS requires explicit permission for DeviceMotion.
  type DeviceMotionEventStatic = typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  const DME = DeviceMotionEvent as DeviceMotionEventStatic;

  if (typeof DME.requestPermission === 'function') {
    // Ask for permission on first user interaction anywhere.
    const requestOnce = (): void => {
      DME.requestPermission!()
        .then((result) => {
          if (result === 'granted') attachMotion();
        })
        .catch(() => {
          // Graceful degradation — tap-logo still works.
        })
        .finally(() => {
          document.removeEventListener('click', requestOnce);
        });
    };
    document.addEventListener('click', requestOnce, { once: true });
  } else {
    // Non-iOS — attach directly.
    attachMotion();
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test tests/unit/shake-detect.test.ts`
Expected: PASS — all 3 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/nav-overlay.ts tests/unit/shake-detect.test.ts
git commit -m "Add nav overlay controller with shake detection (ShakeDetector unit-tested)"
```

---

## Task 13: Lenis scoped smooth scroll

**Files:**
- Create: `src/scripts/lenis-init.ts`

- [ ] **Step 1: Create the init module**

```ts
import Lenis from 'lenis';

/**
 * Initialize Lenis on the inner `.content-scroll` wrapper — not the document.
 * The fixed nav sits outside; only main content scrolls.
 */
export function initLenis(): void {
  if (typeof document === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wrapper = document.querySelector<HTMLElement>('main.content-scroll');
  if (!wrapper) return;

  const lenis = new Lenis({
    wrapper,
    content: wrapper,
    smoothWheel: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/lenis-init.ts
git commit -m "Add Lenis init scoped to content-scroll wrapper"
```

---

## Task 14: Page stubs — projects, graphics, video, about

**Files:**
- Modify: `src/pages/projects.astro` (full rewrite)
- Modify: `src/pages/graphics.astro` (full rewrite)
- Delete: `src/pages/motion.astro`
- Delete: `src/pages/creative-direction.astro`
- Create: `src/pages/video.astro`
- Create: `src/pages/about.astro`

- [ ] **Step 1: Rewrite `src/pages/projects.astro`**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
---

<BaseLayout title="Projects — CELLA" activePage="projects">
  <section class="page-hero">
    <h1>Projects</h1>
    <p class="placeholder">Content populated in Plan 2 (CMS Infrastructure).</p>
  </section>
</BaseLayout>

<style lang="scss">
  .page-hero {
    padding: 12rem 2rem 4rem;
    max-width: 900px;

    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(3rem, 8vw, 5rem);
      margin: 0 0 2rem;
    }

    .placeholder {
      color: var(--color-muted, #888);
      font-size: 0.9rem;
    }
  }
</style>
```

- [ ] **Step 2: Rewrite `src/pages/graphics.astro`** (same pattern as projects, title "Graphics", activePage "graphics")

- [ ] **Step 3: Create `src/pages/video.astro`** (same pattern, title "Video", activePage "video")

- [ ] **Step 4: Create `src/pages/about.astro`** (same pattern, title "About", activePage "about")

- [ ] **Step 5: Delete legacy pages**

```bash
rm src/pages/motion.astro src/pages/creative-direction.astro
```

- [ ] **Step 6: Verify type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages
git commit -m "Replace legacy pages with spec-aligned stubs (projects/graphics/video/about)"
```

---

## Task 15: Update home page to use new nav shell

**Files:**
- Modify: `src/pages/index.astro` (change `activePage`, verify particle portrait still works)

- [ ] **Step 1: Update the BaseLayout call**

Change the BaseLayout invocation:

```astro
<BaseLayout title="CELLA — Graphic Designer & Creative Strategist" activePage="home">
```

The rest of the home page content (hero, bio, particle portrait) stays as-is.

- [ ] **Step 2: Verify dev server renders**

Run in a separate terminal: `npm run dev`
Open `http://localhost:4321/` in a browser.
Expected: home page loads. Particle portrait canvas is visible. Nav shell overlays the top of the viewport. Four hand-drawn nav buttons appear at expected positions. Logo bleeds off top-left.

If the nav buttons do not appear: verify that `public/assets/nav/*.png` exist and that their dimensions match the CSS. Use DevTools to inspect; fix any path or size mismatches before moving on.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "Wire home page into new nav shell"
```

---

## Task 16: prefers-reduced-motion guard in global styles

**Files:**
- Modify: `src/styles/global.scss`

- [ ] **Step 1: Inspect current global styles**

Run: `cat src/styles/global.scss`

- [ ] **Step 2: Append reduced-motion guard at the end of the file**

```scss
/**
 * Respect the user's motion preference.
 * Layer 2 (scroll-driven) and Layer 3 (interaction responses) animations are
 * disabled. Layer 1 (View Transitions) native fades remain — the browser
 * handles this via the @media (prefers-reduced-motion) behavior on View
 * Transitions automatically.
 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.scss
git commit -m "Add prefers-reduced-motion guard to global styles"
```

---

## Task 17: Playwright smoke tests (screenshot baseline)

**Files:**
- Create: `tests/e2e/foundation.spec.ts`

- [ ] **Step 1: Write the tests**

```ts
import { expect, test } from '@playwright/test';

const pages = [
  { path: '/',          name: 'home' },
  { path: '/projects',  name: 'projects' },
  { path: '/graphics',  name: 'graphics' },
  { path: '/video',     name: 'video' },
  { path: '/about',     name: 'about' },
] as const;

test.describe('foundation shell', () => {
  for (const { path, name } of pages) {
    test(`${name} renders without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Nav elements present
      await expect(page.locator('.nav-logo')).toBeVisible();
      await expect(page.locator('.nav-btn[data-nav-id="projects"]')).toBeVisible();
      await expect(page.locator('.nav-btn[data-nav-id="graphics"]')).toBeVisible();
      await expect(page.locator('.nav-btn[data-nav-id="video"]')).toBeVisible();
      await expect(page.locator('.nav-btn[data-nav-id="about"]')).toBeVisible();

      // No console errors
      expect(errors).toEqual([]);
    });
  }

  test('nav buttons fit at 768px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const aboutBtn = page.locator('.nav-btn[data-nav-id="about"]');
    const box = await aboutBtn.boundingBox();
    expect(box).not.toBeNull();
    // ABOUT's right edge should be < viewport width (no clipping).
    expect(box!.x + box!.width).toBeLessThan(768);
    // Spec: 734px expected at 768px viewport (34px clearance).
    expect(box!.x + box!.width).toBeCloseTo(734, 0);
  });

  test('mobile nav overlay toggles on logo tap', async ({ page, browserName }) => {
    // Firefox webkit test project hasn't been added yet; run on chromium-mobile only.
    test.skip(browserName !== 'chromium', 'Mobile interaction covered on chromium-mobile project');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const overlay = page.locator('#mobile-nav-overlay');
    await expect(overlay).toBeHidden();

    await page.locator('.nav-logo').click();
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('view-transition-name is applied to nav elements', async ({ page }) => {
    await page.goto('/');
    const logoViewName = await page.locator('.nav-logo').evaluate((el) =>
      getComputedStyle(el).getPropertyValue('view-transition-name'),
    );
    expect(logoViewName.trim()).toBe('logo');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test:e2e`
Expected: all tests pass across chromium-desktop, chromium-mobile, webkit-desktop projects. Any failure is a bug — fix the component or styles, not the test (unless the test is wrong).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/foundation.spec.ts
git commit -m "Add Playwright smoke tests for foundation shell"
```

---

## Task 18: Visual regression baseline (skipped until Plan 3)

Note for the implementer: the full Playwright visual regression comparison described in the spec (screenshot diff against `main`) is implemented in Plan 3 as part of the CI review gate. Foundation only establishes the smoke-test scaffolding. No action needed in this task — this is just a pointer so the implementer does not try to build the baseline comparison here.

- [ ] **Step 1: Document the deferral**

Append to `docs/asset-inventory.md`:

```markdown
## Deferred Checks (see Plan 3)

- Playwright visual regression (screenshot diff vs. `main` baseline) is implemented in Plan 3.
- Build-time image URL verification (`scripts/verify-images.mjs`) is implemented in Plan 2.
- Content pairing check (`scripts/verify-content.mjs`) is implemented in Plan 2.
```

- [ ] **Step 2: Commit**

```bash
git add docs/asset-inventory.md
git commit -m "Document deferred checks (to Plans 2 and 3)"
```

---

## Task 19: Final foundation build + type-check + lint + test

**Purpose:** Verify everything composes.

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: build succeeds. Output in `dist/`.

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Unit tests**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 5: E2E tests**

Run: `npm run test:e2e`
Expected: all pass.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`

Open in browser at `http://localhost:4321/` and verify:
- Home page shows particle portrait, hero text, bio content
- Nav has 4 hand-drawn PNG buttons at irregular y-offsets (4, 10, 11, 18)
- Logo bleeds off top-left
- Clicking PROJECTS navigates to /projects (stub page). Logo remains visible. In Chrome/Edge 126+ or Safari 18.2+, the logo and nav buttons should morph (very subtle — identical positions mean the "morph" is invisible). In Firefox/older Safari, the page loads normally without morph.
- Resize to 375px wide: nav buttons disappear, logo scales to ~60% size, still bleeds off edge.
- Tap/click the logo at 375px width: full-screen overlay with 4 scattered buttons appears. Tap logo again or press Escape to close.
- `prefers-reduced-motion` (toggle in DevTools or system settings) disables Lenis smooth scroll.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "Foundation complete: shell + nav + View Transitions + mobile overlay" --allow-empty
```

(The `--allow-empty` is defensive — if every file was already committed, the commit is harmless; if anything drifted, it records the final state.)

---

## Self-Review Checklist (for the implementer after completion)

- [ ] All 19 tasks complete and committed
- [ ] `npm run check` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all pass
- [ ] `npm run test:e2e` — all pass
- [ ] `npm run build` — succeeds
- [ ] Manual verification (Task 19 Step 6) passes
- [ ] All page stubs render without console errors
- [ ] Nav buttons at correct positions at 768, 1024, 1287, 1440, 1920 viewport widths
- [ ] Mobile overlay toggles correctly at <768px
- [ ] ShakeDetector unit tests pass (shake easter egg is gated by permission; manual device test deferred)
- [ ] prefers-reduced-motion disables Lenis

Blockers from spec that are intentionally deferred to later plans:
- Full Layer 2 scroll-driven animations per page (home has particle portrait only; projects/graphics/video/about are stubs) — Plan 2 adds content and Plan 3 wires per-page animations on populated content
- Full collection schemas and content data — Plan 2
- GitHub Actions CI — Plan 3
- Cloudflare Pages deploy — Plan 3

---

## Next: Plan 2 (CMS Infrastructure)

After Foundation is shipped to a preview URL and manually validated, proceed to `docs/superpowers/plans/2026-04-12-cellasite-cms-infrastructure.md` for:
- Full Zod schemas per collection
- Initial content population (Double Double Whammy as template project, Halliday Carpender, Rose Bud Thorn, then graphics and videos)
- AGENTS.md at repo root
- `scripts/verify-images.mjs`
- `scripts/verify-content.mjs`
- `scripts/image-pipeline.mjs` (sharp + responsive variants)
- Per-project bespoke `.astro` page components
