# Cellasite CMS Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flesh out the three Content Collections with full Zod schemas, populate initial portfolio content (3 projects, 13 graphics, 2 videos, About), build the `sharp` responsive-image pipeline, write bespoke per-project `.astro` pages, add `AGENTS.md` for the Copilot sync loop, and add `verify-images` / `verify-content` build guards that block the build on drift.

**Architecture:** Content lives as JSON files per entry in `src/content/{projects,graphics,videos}/`. Schemas enforce shape. Images have a raw / processed split: source art in `public/media/<slug>/raw/`, responsive variants in `public/media/<slug>/<basename>-{400,800,1600}w.webp` generated idempotently by `scripts/image-pipeline.mjs`. Entries reference images by a slug-relative logical name (e.g. `hero`); a helper resolves that to `<src, srcset>` at render time. Project detail pages are bespoke static files at `src/pages/projects/<slug>.astro`, with Double Double Whammy as the template. Index pages (`/projects`, `/graphics`, `/video`) are data-driven via `getCollection()`. A shared `<Gallery>` primitive handles the common image-row / lightbox case; bespoke pages compose it or hand-roll sections as needed. Build runs `verify-content` → `verify-images` → `astro build`; any drift fails the build.

**Tech Stack:** Astro 6 Content Collections (JSON loader), Zod, `sharp` (responsive WebP), Node 22 for build scripts (ESM `.mjs`), Vitest for pure helpers, Playwright for render smoke.

**Spec:** `docs/superpowers/specs/2026-04-12-cellasite-zine-design.md`

**Prior art:** Plan 1 shipped in commits `c6f1d69` → `ae7709d`. Collections configured with JSON glob loader at `src/content.config.ts` (note: repo-level config, not `src/content/config.ts` — Astro 6 location). Stub pages exist; this plan replaces them with data-driven index pages and bespoke detail pages.

---

## File Structure

**New files:**
- `AGENTS.md` — Copilot instruction manual for Readymag → Astro sync
- `scripts/image-pipeline.mjs` — sharp responsive-variant generator with checksum cache
- `scripts/verify-images.mjs` — ensures every referenced image asset exists on disk
- `scripts/verify-content.mjs` — ensures content/page pairing and cross-reference integrity
- `scripts/lib/image-manifest.mjs` — shared manifest reader used by pipeline + verify
- `src/lib/images.ts` — runtime helper: `resolveImage(slug, name)` → `{ src, srcset, sizes, width, height }`
- `src/lib/images-manifest.json` — generated; maps `<slug>/<name>` → variant paths + dimensions
- `src/components/Gallery.astro` — shared image-row / lightbox primitive
- `src/components/PressQuotes.astro` — reusable press-quote block
- `src/pages/projects/double-double-whammy.astro` — bespoke detail (template)
- `src/pages/projects/halliday-carpender.astro` — bespoke detail
- `src/pages/projects/rose-bud-thorn.astro` — bespoke detail
- `src/content/projects/double-double-whammy.json`
- `src/content/projects/halliday-carpender.json`
- `src/content/projects/rose-bud-thorn.json`
- `src/content/graphics/{13 entries}.json`
- `src/content/videos/tucson-music-video.json`
- `src/content/videos/babehoven-wnyu-live.json`
- `src/content/about.json` — single-page About metadata (bio, contact, software, openness)
- `tests/unit/images-manifest.test.ts` — pure helpers for manifest generation + variant resolution
- `tests/unit/verify-content.test.ts` — pairing + schema checks on a fixture tree
- `public/media/<slug>/raw/` directories populated with real or 1×1-placeholder raw sources (Task 8)

**Modified files:**
- `src/content.config.ts` — full Zod schemas (replaces Plan 1 stubs)
- `src/pages/projects.astro` — data-driven index listing all projects
- `src/pages/graphics.astro` — data-driven index listing all graphics
- `src/pages/video.astro` — data-driven index listing all videos
- `src/pages/about.astro` — reads `src/content/about.json`
- `package.json` — add `sharp`, add `prebuild`, `images`, `verify` scripts
- `.gitignore` — ignore generated `public/media/**/*-{400,800,1600}w.webp` variants. `src/lib/images-manifest.json` IS committed for deterministic builds.
- `tests/e2e/foundation.spec.ts` — extend with per-section render smoke tests

**Deleted files:**
- None.

**Out of scope for this plan (Plan 3):**
- GitHub Actions CI that runs the review gate on PRs
- Cloudflare Pages build hook wiring (build command remains `npm run build`, Cloudflare picks it up)
- DNS cutover from Readymag
- Playwright visual-regression screenshot baseline
- Custom cursor (Layer 3 interaction)
- GSAP scroll-driven animations layered on populated content (parallax, pull quotes, masonry stagger) — content arrives here; motion gets layered later

---

## Task 1: Install sharp, wire new npm scripts

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install sharp**

```bash
cd /Users/ashleyraiteri/ashcode/cellasite
npm install --save-dev sharp
```

Expected: `sharp@^0.34` (or latest 0.x) added to `devDependencies`.

- [ ] **Step 2: Add scripts to `package.json`**

Replace the `scripts` block with:

```json
"scripts": {
  "dev": "astro dev",
  "prebuild": "node scripts/image-pipeline.mjs && node scripts/verify-content.mjs && node scripts/verify-images.mjs",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro",
  "check": "astro check",
  "lint": "eslint . --ext .ts,.astro,.js,.mjs",
  "format": "prettier --check .",
  "format:fix": "prettier --write .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "images": "node scripts/image-pipeline.mjs",
  "verify": "node scripts/verify-content.mjs && node scripts/verify-images.mjs"
}
```

- [ ] **Step 3: Update `.gitignore`**

Append:

```
# generated responsive image variants (regenerated by scripts/image-pipeline.mjs)
public/media/**/*-400w.webp
public/media/**/*-800w.webp
public/media/**/*-1600w.webp
```

Raw source art (`public/media/<slug>/raw/**`) is committed. Variants are generated.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "$(cat <<'EOF'
Add sharp and wire image pipeline / verify scripts

Prebuild now runs image-pipeline → verify-content → verify-images
so any content or image drift fails the build.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 2: Full Zod schemas for projects / graphics / videos / about

**Purpose:** Replace the Plan 1 stubs with the full shape required by the spec content inventory. All three collections share a common `ImageRef` shape so the image helper can resolve variants uniformly.

**Files:**
- Modify: `src/content.config.ts` (full rewrite)

- [ ] **Step 1: Rewrite `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'zod';

/**
 * Shared primitives.
 */

// An image reference is a logical name scoped to a slug directory.
// The `name` maps to <public/media/<slug>/raw/<name>.{jpg,png,webp}> and is
// resolved to a responsive variant set by src/lib/images.ts at render time.
const imageRef = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase kebab-case'),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

const externalLink = z.object({
  label: z.string(),
  url: z.string().url(),
});

const pressQuote = z.object({
  quote: z.string(),
  source: z.string(),            // e.g. "Pitchfork"
  author: z.string().optional(), // e.g. "Jayson Greene"
  url: z.string().url().optional(),
});

/**
 * Projects collection.
 *
 * A project can have bespoke sub-sections (Double Double Whammy has three:
 * Graphics/Merch, Press Sites, Motion). Each sub-section has its own image set
 * and optional per-artist metadata. verify-content.mjs asserts that every
 * project slug has a matching src/pages/projects/<slug>.astro.
 */
const subSection = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string(),
  description: z.string().optional(),
  images: z.array(imageRef).default([]),
  artists: z.array(z.string()).default([]),
});

const projectSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  category: z.enum([
    'label-design',
    'narrative',
    'interaction-design',
    'other',
  ]),
  years: z.array(z.number().int().min(2000).max(2100)).min(1),
  role: z.string(),                       // e.g. "Creative direction, graphic design"
  artists: z.array(z.string()).default([]),
  tagline: z.string().optional(),         // short blurb for index card
  description: z.string(),                 // longer paragraph for detail hero
  thumbnail: imageRef,                     // used on /projects index
  hero: imageRef.optional(),              // optional separate hero
  subSections: z.array(subSection).default([]),
  pressQuotes: z.array(pressQuote).default([]),
  links: z.array(externalLink).default([]),
  order: z.number().int().default(100),   // lower = earlier on index
});

/**
 * Graphics collection.
 *
 * Single-image cards on the /graphics index, plus optional larger write-up.
 * No bespoke detail pages by default — the index is the experience.
 */
const graphicSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  category: z.enum([
    'tour-poster',
    'merch',
    'show-poster',
    'typography',
    'radio-poster',
    'promo',
    'flyer',
    'campaign',
    'other',
  ]),
  year: z.number().int().min(2000).max(2100).optional(),
  artist: z.string().optional(),          // e.g. "This is Lorelei"
  venue: z.string().optional(),           // e.g. "Knockdown Center"
  description: z.string().optional(),
  image: imageRef,                        // primary displayed image
  pressQuotes: z.array(pressQuote).default([]),    // Truth Club, Allegra Krieger use these
  links: z.array(externalLink).default([]),
  order: z.number().int().default(100),
});

/**
 * Videos collection.
 *
 * Video entries can be either a direct self-hosted file (not recommended for
 * large files) or an embed URL (Vimeo / YouTube / VEVO). Exactly one of
 * `embedUrl` or `videoFile` must be set; refine() enforces the XOR.
 */
const videoSchema = z
  .object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    year: z.number().int().min(2000).max(2100),
    role: z.string(),                     // e.g. "Director", "Graphics / Filming / Editing"
    artist: z.string().optional(),
    description: z.string().optional(),
    thumbnail: imageRef,                   // required — used as poster and index card
    embedUrl: z.string().url().optional(), // Vimeo / YouTube / VEVO
    videoFile: z.string().optional(),      // path relative to public/, e.g. "/media/<slug>/video.mp4"
    embedProvider: z.enum(['vimeo', 'youtube', 'vevo']).optional(),
    links: z.array(externalLink).default([]),
    order: z.number().int().default(100),
  })
  .refine((v) => (v.embedUrl ? 1 : 0) + (v.videoFile ? 1 : 0) === 1, {
    message: 'Exactly one of embedUrl or videoFile must be set',
    path: ['embedUrl'],
  })
  .refine((v) => !v.embedUrl || !!v.embedProvider, {
    message: 'embedProvider is required when embedUrl is set',
    path: ['embedProvider'],
  });

/**
 * About is a singleton — one entry keyed by `about` loaded via file loader.
 * The slug field is required and fixed to "about"; it makes image refs on
 * this entry symmetric with other collections (verify-content uses slug to
 * resolve manifest keys).
 */
const aboutSchema = z.object({
  slug: z.literal('about'),
  bio: z.array(z.string()).min(1),         // paragraphs
  contact: z.object({
    email: z.string().email(),
    instagram: z.string(),                 // handle, no @
    instagramUrl: z.string().url(),
  }),
  software: z.object({
    proficient: z.array(z.string()),
    learning: z.array(z.string()),
  }),
  opennessStatement: z.string(),           // "Currently open to…"
  portrait: imageRef.optional(),
});

export const collections = {
  projects: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  graphics: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/graphics' }),
    schema: graphicSchema,
  }),
  videos: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/videos' }),
    schema: videoSchema,
  }),
  about: defineCollection({
    loader: file('src/content/about.json'),
    schema: aboutSchema,
  }),
};

export type ImageRef = z.infer<typeof imageRef>;
export type ProjectEntry = z.infer<typeof projectSchema>;
export type GraphicEntry = z.infer<typeof graphicSchema>;
export type VideoEntry = z.infer<typeof videoSchema>;
export type AboutEntry = z.infer<typeof aboutSchema>;
```

- [ ] **Step 2: Verify type-check still runs**

Run: `npm run check`
Expected: 0 errors. (Empty collections are valid; types compile.)

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "$(cat <<'EOF'
Expand Content Collection schemas with full field sets

Projects gain subSections, artists, pressQuotes, links, role.
Graphics gain category enum, artist/venue, pressQuotes.
Videos require exactly one of embedUrl (with provider) or videoFile.
Adds singleton about collection for the About page.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 3: Image manifest shape and pure helpers (TDD)

**Purpose:** The image pipeline and verify-images both need to know which raw inputs map to which output variants and dimensions. Extract that logic into a pure module that can be unit-tested.

**Files:**
- Create: `scripts/lib/image-manifest.mjs`
- Create: `tests/unit/images-manifest.test.ts`

- [ ] **Step 1: Write failing tests**

Write to `tests/unit/images-manifest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  parseRawPath,
  variantFilename,
  VARIANT_WIDTHS,
  manifestKey,
} from '../../scripts/lib/image-manifest.mjs';

describe('image-manifest helpers', () => {
  describe('parseRawPath', () => {
    it('extracts slug and name from raw path', () => {
      expect(parseRawPath('public/media/double-double-whammy/raw/hero.jpg')).toEqual({
        slug: 'double-double-whammy',
        name: 'hero',
        ext: 'jpg',
      });
    });

    it('accepts png', () => {
      expect(parseRawPath('public/media/rose-bud-thorn/raw/thumb.png')).toEqual({
        slug: 'rose-bud-thorn',
        name: 'thumb',
        ext: 'png',
      });
    });

    it('accepts webp', () => {
      expect(parseRawPath('public/media/x/raw/y.webp')).toEqual({
        slug: 'x',
        name: 'y',
        ext: 'webp',
      });
    });

    it('rejects files outside a raw/ directory', () => {
      expect(() => parseRawPath('public/media/x/thumb.jpg')).toThrow(/raw\//);
    });

    it('rejects unsupported extensions', () => {
      expect(() => parseRawPath('public/media/x/raw/y.gif')).toThrow(/extension/i);
    });
  });

  describe('variantFilename', () => {
    it('builds a 800w webp name', () => {
      expect(variantFilename('hero', 800)).toBe('hero-800w.webp');
    });

    it('builds a 400w webp name', () => {
      expect(variantFilename('cover-art', 400)).toBe('cover-art-400w.webp');
    });
  });

  describe('VARIANT_WIDTHS', () => {
    it('has 400, 800, 1600 in ascending order', () => {
      expect(VARIANT_WIDTHS).toEqual([400, 800, 1600]);
    });
  });

  describe('manifestKey', () => {
    it('joins slug and name with /', () => {
      expect(manifestKey('double-double-whammy', 'hero')).toBe(
        'double-double-whammy/hero',
      );
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test tests/unit/images-manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `scripts/lib/image-manifest.mjs`**

```js
// @ts-check
/**
 * Pure helpers for the image pipeline and verifiers.
 *
 * Layout:
 *   public/media/<slug>/raw/<name>.{jpg,png,webp}   ← source art (committed)
 *   public/media/<slug>/<name>-{400,800,1600}w.webp ← generated (gitignored)
 *
 * The manifest (src/lib/images-manifest.json) is produced by
 * scripts/image-pipeline.mjs and consumed by src/lib/images.ts at render time
 * and by scripts/verify-images.mjs during build.
 */

export const VARIANT_WIDTHS = /** @type {const} */ ([400, 800, 1600]);
export const SUPPORTED_EXTS = /** @type {const} */ (['jpg', 'jpeg', 'png', 'webp']);

const RAW_RE = /public\/media\/([a-z0-9][a-z0-9-]*)\/raw\/([a-z0-9][a-z0-9-]*)\.([a-z0-9]+)$/;

/**
 * @param {string} rawPath  e.g. "public/media/<slug>/raw/<name>.jpg"
 * @returns {{ slug: string, name: string, ext: string }}
 */
export function parseRawPath(rawPath) {
  // Normalize Windows separators.
  const normalized = rawPath.split(/[\\/]+/g).join('/');
  const m = RAW_RE.exec(normalized);
  if (!m) {
    throw new Error(
      `Expected "public/media/<slug>/raw/<name>.<ext>", got "${rawPath}"`,
    );
  }
  const [, slug, name, ext] = m;
  const e = ext.toLowerCase();
  if (!SUPPORTED_EXTS.includes(/** @type {any} */ (e))) {
    throw new Error(`Unsupported image extension "${ext}" in ${rawPath}`);
  }
  return { slug, name, ext: e === 'jpeg' ? 'jpg' : e };
}

/**
 * @param {string} name
 * @param {number} width
 */
export function variantFilename(name, width) {
  return `${name}-${width}w.webp`;
}

/**
 * @param {string} slug
 * @param {string} name
 */
export function manifestKey(slug, name) {
  return `${slug}/${name}`;
}

/**
 * @typedef {Object} ManifestEntry
 * @property {string} slug
 * @property {string} name
 * @property {string} rawPath       // relative to repo root
 * @property {string} rawChecksum   // sha256 of raw bytes
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {Array<{ width: number, path: string }>} variants  // path is /media/... web path
 */
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test tests/unit/images-manifest.test.ts`
Expected: PASS — all assertions.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/image-manifest.mjs tests/unit/images-manifest.test.ts
git commit -m "$(cat <<'EOF'
Add image-manifest pure helpers with unit tests

Parses raw/ paths and generates variant filenames. Shared by the
image pipeline and the verify-images check.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 4: Image pipeline script (sharp + checksum cache)

**Purpose:** Walk every `public/media/<slug>/raw/*` source image, generate 400w / 800w / 1600w WebP variants into `public/media/<slug>/`, and write a manifest that maps `<slug>/<name>` to variant paths and source dimensions. Skip sources whose checksum hasn't changed since the last run; `--force` bypasses the cache.

**Files:**
- Create: `scripts/image-pipeline.mjs`

- [ ] **Step 1: Create the script**

Write to `scripts/image-pipeline.mjs`:

```js
// @ts-check
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import sharp from 'sharp';
import {
  VARIANT_WIDTHS,
  parseRawPath,
  variantFilename,
  manifestKey,
} from './lib/image-manifest.mjs';

const ROOT = process.cwd();
const MEDIA_ROOT = join(ROOT, 'public', 'media');
const MANIFEST_PATH = join(ROOT, 'src', 'lib', 'images-manifest.json');

const FORCE = process.argv.includes('--force');

/** @returns {Promise<string[]>} absolute paths of every raw image */
async function findRawImages() {
  if (!existsSync(MEDIA_ROOT)) return [];
  const out = [];
  const entries = await readdir(MEDIA_ROOT, { withFileTypes: true });
  for (const slugDir of entries) {
    if (!slugDir.isDirectory()) continue;
    const rawDir = join(MEDIA_ROOT, slugDir.name, 'raw');
    if (!existsSync(rawDir)) continue;
    const files = await readdir(rawDir);
    for (const f of files) {
      if (/\.(jpe?g|png|webp)$/i.test(f)) {
        out.push(join(rawDir, f));
      }
    }
  }
  return out.sort();
}

/** @param {string} path */
async function sha256(path) {
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {string} absRawPath
 * @param {string} slug
 * @param {string} name
 * @param {string} checksum
 */
async function processOne(absRawPath, slug, name, checksum) {
  const outDir = join(MEDIA_ROOT, slug);
  await mkdir(outDir, { recursive: true });

  const image = sharp(absRawPath, { failOn: 'truncated' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`sharp could not read dimensions for ${absRawPath}`);
  }

  /** @type {Array<{ width: number, path: string }>} */
  const variants = [];
  for (const width of VARIANT_WIDTHS) {
    // Never upscale: if the source is smaller than the target width, skip.
    if (meta.width < width) continue;
    const fname = variantFilename(name, width);
    const outPath = join(outDir, fname);
    await image
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    variants.push({ width, path: `/media/${slug}/${fname}` });
  }

  // Always guarantee at least one variant (the source-width webp) so that
  // callers can rely on manifest entries having variants.length >= 1.
  if (variants.length === 0) {
    const fname = variantFilename(name, meta.width);
    const outPath = join(outDir, fname);
    await image.clone().webp({ quality: 82 }).toFile(outPath);
    variants.push({ width: meta.width, path: `/media/${slug}/${fname}` });
  }

  return {
    slug,
    name,
    rawPath: relative(ROOT, absRawPath),
    rawChecksum: checksum,
    sourceWidth: meta.width,
    sourceHeight: meta.height,
    variants,
  };
}

async function run() {
  await mkdir(dirname(MANIFEST_PATH), { recursive: true });

  const raws = await findRawImages();
  /** @type {Record<string, import('./lib/image-manifest.mjs').ManifestEntry>} */
  const manifest = {};

  // Load prior manifest for incremental reuse.
  /** @type {Record<string, any>} */
  let prior = {};
  if (existsSync(MANIFEST_PATH)) {
    try {
      prior = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    } catch {
      prior = {};
    }
  }

  let processed = 0;
  let skipped = 0;

  for (const absRaw of raws) {
    const rel = relative(ROOT, absRaw);
    const { slug, name } = parseRawPath(rel);
    const key = manifestKey(slug, name);
    const checksum = await sha256(absRaw);

    const priorEntry = prior[key];
    const allVariantsExist =
      priorEntry &&
      Array.isArray(priorEntry.variants) &&
      priorEntry.variants.every((/** @type {any} */ v) =>
        existsSync(join(ROOT, 'public', v.path.replace(/^\//, ''))),
      );

    if (!FORCE && priorEntry && priorEntry.rawChecksum === checksum && allVariantsExist) {
      manifest[key] = priorEntry;
      skipped += 1;
      continue;
    }

    manifest[key] = await processOne(absRaw, slug, name, checksum);
    processed += 1;
  }

  // Drop keys from the old manifest whose raw file no longer exists.
  const nowKeys = new Set(Object.keys(manifest));
  const priorKeys = Object.keys(prior);
  const dropped = priorKeys.filter((k) => !nowKeys.has(k));

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(
    `[image-pipeline] processed=${processed} skipped=${skipped} dropped=${dropped.length} total=${raws.length}`,
  );
  if (dropped.length > 0) {
    console.log(`[image-pipeline] dropped: ${dropped.join(', ')}`);
  }
}

run().catch((err) => {
  console.error('[image-pipeline] FAILED');
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify script runs on empty input**

Run: `node scripts/image-pipeline.mjs`
Expected stdout: `[image-pipeline] processed=0 skipped=0 dropped=0 total=0`. Creates `src/lib/images-manifest.json` containing `{}`.

If the script errors because `src/lib/` doesn't exist yet: that's a bug in the script — verify the `mkdir(dirname(MANIFEST_PATH), ...)` line runs before the write.

- [ ] **Step 3: Commit**

```bash
git add scripts/image-pipeline.mjs src/lib/images-manifest.json
git commit -m "$(cat <<'EOF'
Add sharp-based image pipeline with checksum cache

Walks public/media/<slug>/raw/* → emits 400/800/1600w WebP
variants into public/media/<slug>/ and writes src/lib/
images-manifest.json. Sources are skipped when checksum matches
the prior manifest entry and all variants still exist on disk.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 5: Runtime image helper

**Purpose:** Components need to turn a logical `{ name: 'hero' }` ref into `<img src srcset sizes>` attributes. One helper, typed, reads the generated manifest.

**Files:**
- Create: `src/lib/images.ts`

- [ ] **Step 1: Create the helper**

Write to `src/lib/images.ts`:

```ts
import manifest from './images-manifest.json';

export interface ResolvedImage {
  src: string;       // largest variant path (/media/...)
  srcset: string;    // "path 400w, path 800w, path 1600w"
  sizes: string;     // responsive sizes attribute
  width: number;     // source (intrinsic) width
  height: number;    // source (intrinsic) height
  alt: string;
}

interface ManifestEntry {
  slug: string;
  name: string;
  rawPath: string;
  rawChecksum: string;
  sourceWidth: number;
  sourceHeight: number;
  variants: Array<{ width: number; path: string }>;
}

const MANIFEST = manifest as Record<string, ManifestEntry>;

const DEFAULT_SIZES =
  '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw';

/**
 * Resolve a logical image ref to render-ready attributes.
 * Throws at build time if the ref does not exist — this is intentional,
 * verify-images catches the same case earlier in the build.
 */
export function resolveImage(
  slug: string,
  name: string,
  opts: { alt: string; sizes?: string } = { alt: '' },
): ResolvedImage {
  const key = `${slug}/${name}`;
  const entry = MANIFEST[key];
  if (!entry) {
    throw new Error(
      `resolveImage: no manifest entry for "${key}". Place the source at ` +
        `public/media/${slug}/raw/${name}.{jpg,png,webp} and run \`npm run images\`.`,
    );
  }
  if (entry.variants.length === 0) {
    throw new Error(`resolveImage: manifest entry "${key}" has no variants.`);
  }

  const sorted = [...entry.variants].sort((a, b) => a.width - b.width);
  const largest = sorted[sorted.length - 1]!;
  const srcset = sorted.map((v) => `${v.path} ${v.width}w`).join(', ');

  return {
    src: largest.path,
    srcset,
    sizes: opts.sizes ?? DEFAULT_SIZES,
    width: entry.sourceWidth,
    height: entry.sourceHeight,
    alt: opts.alt,
  };
}

/**
 * Return true if the manifest has an entry for slug/name. Useful for conditional
 * renders (e.g. optional hero image) without throwing.
 */
export function hasImage(slug: string, name: string): boolean {
  return (`${slug}/${name}` in MANIFEST);
}
```

- [ ] **Step 2: Verify type-check compiles**

Run: `npm run check`
Expected: 0 errors. Empty manifest is valid; no components call `resolveImage` yet.

- [ ] **Step 3: Commit**

```bash
git add src/lib/images.ts
git commit -m "$(cat <<'EOF'
Add runtime image helper resolving manifest to src/srcset/sizes

Components call resolveImage(slug, name, { alt }) and get back
render-ready attrs. Throws if the manifest entry is missing —
verify-images catches the same case earlier in the build.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 6: verify-content script — pairing + schema drift

**Purpose:** Walk content entries and enforce (a) every `projects/<slug>.json` has a matching `src/pages/projects/<slug>.astro`, (b) every such page references an existing collection entry, (c) every image ref in content resolves in the manifest, (d) the singleton about file exists.

**Files:**
- Create: `scripts/verify-content.mjs`
- Create: `tests/unit/verify-content.test.ts`

- [ ] **Step 1: Write failing tests**

Write to `tests/unit/verify-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findDrift, extractImageRefs } from '../../scripts/verify-content.mjs';

describe('verify-content helpers', () => {
  describe('findDrift', () => {
    it('reports content entry without matching page', () => {
      const result = findDrift({
        projectSlugs: ['foo', 'bar'],
        projectPages: ['foo'], // bar missing
      });
      expect(result.missingPages).toEqual(['bar']);
      expect(result.orphanPages).toEqual([]);
    });

    it('reports page without matching content', () => {
      const result = findDrift({
        projectSlugs: ['foo'],
        projectPages: ['foo', 'orphan'],
      });
      expect(result.missingPages).toEqual([]);
      expect(result.orphanPages).toEqual(['orphan']);
    });

    it('clean tree has no drift', () => {
      const result = findDrift({
        projectSlugs: ['a', 'b'],
        projectPages: ['a', 'b'],
      });
      expect(result.missingPages).toEqual([]);
      expect(result.orphanPages).toEqual([]);
    });
  });

  describe('extractImageRefs', () => {
    it('collects imageRefs from a project entry with sub-sections', () => {
      const refs = extractImageRefs({
        slug: 'ddw',
        thumbnail: { name: 'thumb', alt: 't' },
        hero: { name: 'hero', alt: 'h' },
        subSections: [
          {
            id: 'graphics',
            title: 'Graphics',
            images: [
              { name: 'merch-1', alt: 'm1' },
              { name: 'merch-2', alt: 'm2' },
            ],
          },
        ],
      });
      expect(refs.sort()).toEqual(
        ['ddw/hero', 'ddw/merch-1', 'ddw/merch-2', 'ddw/thumb'].sort(),
      );
    });

    it('handles entry with only a thumbnail', () => {
      const refs = extractImageRefs({
        slug: 'g1',
        thumbnail: { name: 'thumb', alt: 't' },
      });
      expect(refs).toEqual(['g1/thumb']);
    });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test tests/unit/verify-content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `scripts/verify-content.mjs`**

```js
// @ts-check
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/**
 * @param {{ projectSlugs: string[], projectPages: string[] }} input
 */
export function findDrift({ projectSlugs, projectPages }) {
  const slugs = new Set(projectSlugs);
  const pages = new Set(projectPages);
  const missingPages = [...slugs].filter((s) => !pages.has(s)).sort();
  const orphanPages = [...pages].filter((p) => !slugs.has(p)).sort();
  return { missingPages, orphanPages };
}

/**
 * @param {any} entry  a parsed JSON entry (any collection)
 * @returns {string[]}  flat list of "slug/name" manifest keys
 */
export function extractImageRefs(entry) {
  const refs = new Set();
  const slug = entry.slug;
  if (!slug) return [];

  /** @param {unknown} ref */
  const push = (ref) => {
    if (ref && typeof ref === 'object' && typeof (/** @type {any} */ (ref)).name === 'string') {
      refs.add(`${slug}/${/** @type {any} */ (ref).name}`);
    }
  };

  push(entry.thumbnail);
  push(entry.hero);
  push(entry.image);
  push(entry.portrait);
  if (Array.isArray(entry.subSections)) {
    for (const section of entry.subSections) {
      if (Array.isArray(section.images)) section.images.forEach(push);
    }
  }
  return [...refs];
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}  slugs (filenames without .json)
 */
async function listJsonSlugs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}  slugs (filenames without .astro)
 */
async function listAstroSlugs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith('.astro'))
    .map((f) => f.replace(/\.astro$/, ''))
    .sort();
}

async function main() {
  const errors = [];

  // 1) Projects ↔ pages pairing.
  const projectSlugs = await listJsonSlugs(join(ROOT, 'src/content/projects'));
  const projectPages = await listAstroSlugs(join(ROOT, 'src/pages/projects'));
  const { missingPages, orphanPages } = findDrift({ projectSlugs, projectPages });
  for (const slug of missingPages) {
    errors.push(`projects/${slug}.json exists but src/pages/projects/${slug}.astro is missing`);
  }
  for (const slug of orphanPages) {
    errors.push(`src/pages/projects/${slug}.astro exists but src/content/projects/${slug}.json is missing`);
  }

  // 2) About singleton exists.
  const aboutPath = join(ROOT, 'src/content/about.json');
  if (!existsSync(aboutPath)) {
    errors.push('src/content/about.json is missing (required by the about collection)');
  }

  // 3) Every image ref in every entry has a manifest entry.
  const manifestPath = join(ROOT, 'src/lib/images-manifest.json');
  /** @type {Record<string, any>} */
  let manifest = {};
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (e) {
      errors.push(`images-manifest.json is not valid JSON: ${e}`);
    }
  } else {
    errors.push('src/lib/images-manifest.json missing — run `npm run images` first');
  }

  // About singleton: parse, sanity-check shape, and check its image refs.
  // The file() loader expects an array or object; we use [{ slug: "about", ... }].
  if (existsSync(aboutPath)) {
    try {
      const aboutRaw = JSON.parse(await readFile(aboutPath, 'utf8'));
      if (!Array.isArray(aboutRaw) || aboutRaw.length !== 1) {
        errors.push('src/content/about.json must be a single-item array: [{ "slug": "about", ... }]');
      } else {
        const entry = aboutRaw[0];
        if (entry.slug !== 'about') {
          errors.push(`src/content/about.json entry slug must be "about" (got "${entry.slug}")`);
        }
        const refs = extractImageRefs(entry);
        for (const ref of refs) {
          if (!(ref in manifest)) {
            errors.push(`about.json references image "${ref}" which is not in the manifest`);
          }
        }
      }
    } catch (e) {
      errors.push(`src/content/about.json is not valid JSON: ${e}`);
    }
  }

  const collectionDirs = [
    { name: 'projects', dir: 'src/content/projects' },
    { name: 'graphics', dir: 'src/content/graphics' },
    { name: 'videos',   dir: 'src/content/videos' },
  ];

  for (const { name: cname, dir } of collectionDirs) {
    const absDir = join(ROOT, dir);
    if (!existsSync(absDir)) continue;
    const files = (await readdir(absDir)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const abs = join(absDir, f);
      let parsed;
      try {
        parsed = JSON.parse(await readFile(abs, 'utf8'));
      } catch (e) {
        errors.push(`${dir}/${f} is not valid JSON: ${e}`);
        continue;
      }
      if (!parsed.slug) {
        errors.push(`${dir}/${f} is missing required field "slug"`);
        continue;
      }
      const expectedSlug = f.replace(/\.json$/, '');
      if (parsed.slug !== expectedSlug) {
        errors.push(
          `${dir}/${f} has slug "${parsed.slug}" but filename implies "${expectedSlug}"`,
        );
      }
      const refs = extractImageRefs(parsed);
      for (const ref of refs) {
        if (!(ref in manifest)) {
          errors.push(`${dir}/${f} references image "${ref}" which is not in the manifest`);
        }
      }
      // Videos: XOR embedUrl / videoFile is enforced by schema but we double-check
      // that videoFile, if set, actually points at a file.
      if (cname === 'videos' && parsed.videoFile) {
        const abs2 = join(ROOT, 'public', parsed.videoFile.replace(/^\//, ''));
        if (!existsSync(abs2)) {
          errors.push(`videos/${f} videoFile "${parsed.videoFile}" not found on disk`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('[verify-content] FAILED');
    for (const err of errors) console.error(' - ' + err);
    process.exit(1);
  }
  console.log('[verify-content] OK');
}

// Only run when invoked directly, not when imported for tests.
if (process.argv[1] && process.argv[1].endsWith('verify-content.mjs')) {
  main().catch((err) => {
    console.error('[verify-content] CRASHED');
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run unit tests, verify they pass**

Run: `npm run test tests/unit/verify-content.test.ts`
Expected: PASS — 5 assertions.

- [ ] **Step 5: Run the script against the current (empty) tree**

Run: `node scripts/verify-content.mjs`
Expected: exit 1 with the single error `src/content/about.json is missing (required by the about collection)`. That's fine — Task 10 populates it. The remaining tasks will satisfy the checks.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-content.mjs tests/unit/verify-content.test.ts
git commit -m "$(cat <<'EOF'
Add verify-content build check for pairing + image refs

Catches: content/page drift, missing about singleton, missing
image refs in the manifest, slug/filename mismatch, unreadable
JSON, and videos pointing at a videoFile that doesn't exist.
Pure helpers (findDrift, extractImageRefs) are unit-tested.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 7: verify-images script — every manifest variant lands on disk

**Purpose:** After the pipeline runs, every variant path in the manifest must resolve to an actual file on disk. This catches partial runs, stale manifests, and checked-in paths that point at assets someone forgot to commit.

**Files:**
- Create: `scripts/verify-images.mjs`

- [ ] **Step 1: Create the script**

Write to `scripts/verify-images.mjs`:

```js
// @ts-check
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'src/lib/images-manifest.json');

async function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('[verify-images] src/lib/images-manifest.json missing — run `npm run images` first');
    process.exit(1);
  }

  /** @type {Record<string, any>} */
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const errors = [];
  let variantCount = 0;

  for (const [key, entry] of Object.entries(manifest)) {
    // Raw file still exists?
    const rawAbs = join(ROOT, entry.rawPath);
    if (!existsSync(rawAbs)) {
      errors.push(`${key}: rawPath "${entry.rawPath}" missing on disk`);
    }

    if (!Array.isArray(entry.variants) || entry.variants.length === 0) {
      errors.push(`${key}: no variants in manifest`);
      continue;
    }

    for (const v of entry.variants) {
      variantCount += 1;
      const abs = join(ROOT, 'public', v.path.replace(/^\//, ''));
      if (!existsSync(abs)) {
        errors.push(`${key}: variant ${v.width}w missing at ${v.path}`);
        continue;
      }
      const size = statSync(abs).size;
      if (size === 0) {
        errors.push(`${key}: variant ${v.width}w at ${v.path} is empty`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('[verify-images] FAILED');
    for (const err of errors) console.error(' - ' + err);
    process.exit(1);
  }

  console.log(
    `[verify-images] OK — ${Object.keys(manifest).length} sources, ${variantCount} variants`,
  );
}

main().catch((err) => {
  console.error('[verify-images] CRASHED');
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run against empty manifest**

Run: `node scripts/verify-images.mjs`
Expected: `[verify-images] OK — 0 sources, 0 variants`. Empty manifest is valid (there's just nothing to verify yet).

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-images.mjs
git commit -m "$(cat <<'EOF'
Add verify-images build check for manifest ↔ disk parity

Fails the build if any manifest variant is missing or empty,
or if the raw source has been deleted without re-running the
pipeline.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 8: Stage raw images for 3 projects (placeholder OK)

**Purpose:** Get the pipeline producing real variants so downstream tasks have images to reference. Cella will replace these with final Readymag-CDN pulls during the Copilot sync loop; for this plan we stage hand-drawn portfolio assets we already have plus placeholders.

**Files:**
- Create: `public/media/double-double-whammy/raw/*` (placeholder images)
- Create: `public/media/halliday-carpender/raw/*`
- Create: `public/media/rose-bud-thorn/raw/*`
- Create: `public/media/about/raw/*`
- Create: `public/media/<graphic-slug>/raw/*` for each of the 11 graphics entries
- Create: `public/media/tucson-music-video/raw/*`
- Create: `public/media/babehoven-wnyu-live/raw/*`
- Create: `public/media/**/raw/.gitkeep`

- [ ] **Step 1: Create the slug directories**

```bash
cd /Users/ashleyraiteri/ashcode/cellasite
mkdir -p \
  public/media/double-double-whammy/raw \
  public/media/halliday-carpender/raw \
  public/media/rose-bud-thorn/raw \
  public/media/about/raw \
  public/media/lorelei-australia/raw \
  public/media/lorelei-uk-europe/raw \
  public/media/lorelei-knockdown/raw \
  public/media/florist-cream-tee/raw \
  public/media/florist-red-tee/raw \
  public/media/susannah-joffe-poster/raw \
  public/media/horses-cant-outrun-me/raw \
  public/media/cella-typography/raw \
  public/media/carter-ward-l-train/raw \
  public/media/april-play-typography/raw \
  public/media/mta-waveform/raw \
  public/media/truth-club-running/raw \
  public/media/allegra-krieger-campaign/raw \
  public/media/been-stellar-flyer/raw \
  public/media/tucson-music-video/raw \
  public/media/babehoven-wnyu-live/raw
```

- [ ] **Step 2: Copy known Portfolio_contents assets**

Portfolio has a Nara's Room folder (used for Tucson Music Video / Nara's Room project) and Home Page Images. Map what exists; leave the rest as placeholders.

```bash
cp "Portfolio_contents/Porfolio Files/Nara_s Room/Front.png"   public/media/tucson-music-video/raw/thumb.png
cp "Portfolio_contents/Porfolio Files/Nara_s Room/Back (1).png" public/media/tucson-music-video/raw/back.png
cp "Portfolio_contents/Porfolio Files/Nara_s Room/BC.jpg"       public/media/tucson-music-video/raw/bc.jpg
cp "Portfolio_contents/Porfolio Files/Nara_s Room/132A0486.jpg" public/media/tucson-music-video/raw/still-1.jpg
cp "Portfolio_contents/Porfolio Files/Nara_s Room/label.png"    public/media/tucson-music-video/raw/label.png
cp "Portfolio_contents/Porfolio Files/Home Page Images/iama.png" public/media/about/raw/portrait.png
```

- [ ] **Step 3: Create 1×1 transparent PNG placeholders for every remaining thumbnail**

Create a 1×1 transparent PNG and copy it as a placeholder thumbnail into any `raw/` directory that will need one before Cella supplies art. (Each placeholder is overwritten by the real asset later.)

```bash
# Write a 1x1 transparent PNG (base64) via node — no python dependency.
node -e "require('fs').writeFileSync('/tmp/placeholder-1x1.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'))"

# Any raw/ dir that doesn't yet have real art gets a single placeholder thumb.png
for dir in public/media/double-double-whammy/raw \
           public/media/halliday-carpender/raw \
           public/media/rose-bud-thorn/raw \
           public/media/lorelei-australia/raw \
           public/media/lorelei-uk-europe/raw \
           public/media/lorelei-knockdown/raw \
           public/media/florist-cream-tee/raw \
           public/media/florist-red-tee/raw \
           public/media/susannah-joffe-poster/raw \
           public/media/horses-cant-outrun-me/raw \
           public/media/cella-typography/raw \
           public/media/carter-ward-l-train/raw \
           public/media/april-play-typography/raw \
           public/media/mta-waveform/raw \
           public/media/truth-club-running/raw \
           public/media/allegra-krieger-campaign/raw \
           public/media/been-stellar-flyer/raw \
           public/media/babehoven-wnyu-live/raw
do
  if [ -z "$(ls "$dir" 2>/dev/null)" ]; then
    cp /tmp/placeholder-1x1.png "$dir/thumb.png"
  fi
done
```

Because the 1×1 source is smaller than any of the 400w / 800w / 1600w targets, the pipeline falls back to emitting a single source-width variant (see Task 4 "Always guarantee at least one variant" branch). That's enough to satisfy the manifest.

- [ ] **Step 4: Run the image pipeline**

Run: `npm run images`
Expected: `[image-pipeline] processed=N skipped=0 dropped=0 total=N` where N is the number of raw files staged (placeholders + Nara's Room assets + about portrait). `src/lib/images-manifest.json` now has entries.

- [ ] **Step 5: Run verify-images**

Run: `node scripts/verify-images.mjs`
Expected: `[verify-images] OK — N sources, M variants`.

- [ ] **Step 6: Commit**

```bash
git add public/media src/lib/images-manifest.json
git commit -m "$(cat <<'EOF'
Stage raw image sources for initial content set

Copies Portfolio Nara's Room assets for Tucson Music Video and
iama portrait for About. Remaining slugs get 1x1 placeholder
thumbs so the pipeline and manifest populate; Cella replaces
these during the Copilot Readymag sync.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 9: Shared Gallery component

**Purpose:** A minimal primitive that renders a row/grid of images from a list of `ImageRef`s, each resolved through the manifest. Bespoke project pages compose it where useful and hand-roll layouts where they don't.

**Files:**
- Create: `src/components/Gallery.astro`

- [ ] **Step 1: Write the component**

Write to `src/components/Gallery.astro`:

```astro
---
import { resolveImage } from '~/lib/images';
import type { ImageRef } from '~/content.config';

interface Props {
  slug: string;
  images: ImageRef[];
  columns?: 1 | 2 | 3 | 4;
  sizes?: string;
}

const { slug, images, columns = 3, sizes } = Astro.props;
---

<div class:list={['gallery', `gallery--cols-${columns}`]}>
  {images.map((ref) => {
    const img = resolveImage(slug, ref.name, { alt: ref.alt, sizes });
    return (
      <figure class="gallery__item">
        <img
          src={img.src}
          srcset={img.srcset}
          sizes={img.sizes}
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading="lazy"
          decoding="async"
        />
        {ref.caption && <figcaption>{ref.caption}</figcaption>}
      </figure>
    );
  })}
</div>

<style lang="scss">
  .gallery {
    display: grid;
    gap: 1.25rem;

    &--cols-1 { grid-template-columns: 1fr; }
    &--cols-2 { grid-template-columns: repeat(2, 1fr); }
    &--cols-3 { grid-template-columns: repeat(3, 1fr); }
    &--cols-4 { grid-template-columns: repeat(4, 1fr); }

    @media (max-width: 767px) {
      grid-template-columns: 1fr !important;
    }
  }

  .gallery__item {
    margin: 0;

    img {
      width: 100%;
      height: auto;
      display: block;
    }

    figcaption {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-muted, #666);
      font-style: italic;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Gallery.astro
git commit -m "$(cat <<'EOF'
Add shared Gallery component with manifest-resolved images

One primitive for image rows/grids. Bespoke pages compose it
or hand-roll where the layout diverges.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 10: PressQuotes component

**Purpose:** Truth Club and Allegra Krieger graphics carry press quotes with them; Double Double Whammy also quotes press. One shared block for both.

**Files:**
- Create: `src/components/PressQuotes.astro`

- [ ] **Step 1: Write the component**

```astro
---
interface Quote {
  quote: string;
  source: string;
  author?: string;
  url?: string;
}

interface Props {
  quotes: Quote[];
  heading?: string;
}

const { quotes, heading = 'Press' } = Astro.props;
---

{quotes.length > 0 && (
  <section class="press-quotes">
    <h2>{heading}</h2>
    <ul>
      {quotes.map((q) => (
        <li class="press-quote">
          <blockquote>{q.quote}</blockquote>
          <footer>
            — {q.author ? `${q.author}, ` : ''}
            {q.url ? <a href={q.url} rel="noopener">{q.source}</a> : q.source}
          </footer>
        </li>
      ))}
    </ul>
  </section>
)}

<style lang="scss">
  .press-quotes {
    padding: 3rem 0;

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 1.5rem;
      margin: 0 0 1.5rem;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 2rem;
    }
  }

  .press-quote {
    blockquote {
      margin: 0 0 0.5rem;
      font-size: 1.15rem;
      line-height: 1.5;
      quotes: '\201C' '\201D';

      &::before { content: open-quote; }
      &::after  { content: close-quote; }
    }

    footer {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      font-style: italic;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PressQuotes.astro
git commit -m "$(cat <<'EOF'
Add PressQuotes component used by projects and graphics

Shared block for press quote blocks on project detail pages and
on individual graphics that quote press (Truth Club, Allegra
Krieger).

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 11: Populate About singleton

**Files:**
- Create: `src/content/about.json`

- [ ] **Step 1: Write the About JSON**

The `file()` loader expects an array or an object-keyed-by-id. We use an
array of one entry so the ID is `slug` — symmetric with the other collections.

```json
[
  {
    "slug": "about",
    "bio": [
      "Designer and creative director based in NYC, working at the intersection of music, visual culture, and storytelling.",
      "Background in journalism and public policy at NYU. Co-wrote and produced a song with 90M+ streams. Directed music videos, styled press shoots, built brands for independent artists and labels."
    ],
    "contact": {
      "email": "cellaraiteri@gmail.com",
      "instagram": "thecelladome",
      "instagramUrl": "https://instagram.com/thecelladome"
    },
    "software": {
      "proficient": [
        "Photoshop",
        "Illustrator",
        "After Effects",
        "Premiere",
        "DaVinci Resolve",
        "Figma",
        "Readymag",
        "Cargo",
        "Squarespace"
      ],
      "learning": [
        "Blender",
        "Cinema 4D"
      ]
    },
    "opennessStatement": "Currently open to full-time and freelance opportunities in creative direction, brand, and editorial design.",
    "portrait": {
      "name": "portrait",
      "alt": "Portrait of Cella Raiteri"
    }
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add src/content/about.json
git commit -m "$(cat <<'EOF'
Populate About singleton content (bio, contact, software, openness)

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 12: Populate Projects collection (3 entries)

**Files:**
- Create: `src/content/projects/double-double-whammy.json`
- Create: `src/content/projects/halliday-carpender.json`
- Create: `src/content/projects/rose-bud-thorn.json`

- [ ] **Step 1: Write Double Double Whammy**

```json
{
  "title": "Double Double Whammy",
  "slug": "double-double-whammy",
  "category": "label-design",
  "years": [2023, 2024, 2025],
  "role": "Creative direction, graphic design, art direction",
  "artists": [
    "Babehoven",
    "Allegra Krieger",
    "Truth Club",
    "This Is Lorelei",
    "Florist",
    "Hovvdy",
    "Lomelda"
  ],
  "tagline": "Label identity & visual system",
  "description": "Ongoing label design and visual system for Double Double Whammy, spanning cover art, merch, press sites, and motion for the roster's 2023–2025 releases.",
  "thumbnail": { "name": "thumb", "alt": "Double Double Whammy label collage" },
  "subSections": [
    {
      "id": "graphics-merch",
      "title": "Graphics & Merch",
      "description": "Cover art, merch, and print graphics across the roster.",
      "images": [],
      "artists": ["Babehoven", "Allegra Krieger", "Truth Club", "This Is Lorelei", "Florist", "Hovvdy", "Lomelda"]
    },
    {
      "id": "press-sites",
      "title": "Press Sites",
      "description": "Microsites and press-kit pages supporting release cycles.",
      "images": [],
      "artists": ["Babehoven", "Allegra Krieger", "This Is Lorelei"]
    },
    {
      "id": "motion",
      "title": "Motion",
      "description": "Lyric videos, social assets, and campaign motion design.",
      "images": [],
      "artists": ["Babehoven", "This Is Lorelei", "Florist"]
    }
  ],
  "pressQuotes": [],
  "links": [
    { "label": "Double Double Whammy", "url": "https://doubledoublewhammy.com" }
  ],
  "order": 10
}
```

- [ ] **Step 2: Write Halliday Carpender**

```json
{
  "title": "Halliday Carpender",
  "slug": "halliday-carpender",
  "category": "narrative",
  "years": [2024],
  "role": "Illustration, art direction, narrative design",
  "artists": ["Halliday Carpender"],
  "tagline": "Illustrated narrative scenes",
  "description": "Illustrated narrative project — \"The Longest Sentence Ever Produced by a Monkey\" — a sequence of scenes that unfold as the reader scrolls.",
  "thumbnail": { "name": "thumb", "alt": "Halliday Carpender illustrated scene" },
  "subSections": [],
  "pressQuotes": [],
  "links": [],
  "order": 20
}
```

- [ ] **Step 3: Write Rose Bud Thorn**

```json
{
  "title": "Rose Bud Thorn",
  "slug": "rose-bud-thorn",
  "category": "interaction-design",
  "years": [2024],
  "role": "Concept, web & interaction design",
  "artists": [],
  "tagline": "Web & interaction design",
  "description": "Conceptual mindfulness web project structured around the rose-bud-thorn reflection prompt. Quiet interaction, measured pacing.",
  "thumbnail": { "name": "thumb", "alt": "Rose Bud Thorn landing composition" },
  "subSections": [],
  "pressQuotes": [],
  "links": [],
  "order": 30
}
```

- [ ] **Step 4: Commit**

```bash
git add src/content/projects
git commit -m "$(cat <<'EOF'
Populate Projects collection — DDW (template), Halliday, Rose Bud Thorn

Double Double Whammy carries the full sub-section shape
(Graphics/Merch, Press Sites, Motion) with all seven artists.
Halliday Carpender and Rose Bud Thorn use the minimal shape —
Copilot expands them from Readymag during sync.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 13: Populate Graphics collection (13 entries)

**Files:**
- Create: `src/content/graphics/lorelei-australia.json`
- Create: `src/content/graphics/lorelei-uk-europe.json`
- Create: `src/content/graphics/lorelei-knockdown.json`
- Create: `src/content/graphics/florist-cream-tee.json`
- Create: `src/content/graphics/florist-red-tee.json`
- Create: `src/content/graphics/susannah-joffe-poster.json`
- Create: `src/content/graphics/horses-cant-outrun-me.json`
- Create: `src/content/graphics/cella-typography.json`
- Create: `src/content/graphics/carter-ward-l-train.json`
- Create: `src/content/graphics/april-play-typography.json`
- Create: `src/content/graphics/mta-waveform.json`
- Create: `src/content/graphics/truth-club-running.json`
- Create: `src/content/graphics/allegra-krieger-campaign.json`
- Create: `src/content/graphics/been-stellar-flyer.json`

- [ ] **Step 1: Write all 13 entries**

`src/content/graphics/lorelei-australia.json`:

```json
{
  "title": "This Is Lorelei — Australia Tour",
  "slug": "lorelei-australia",
  "category": "tour-poster",
  "artist": "This Is Lorelei",
  "description": "Tour poster for This Is Lorelei's Australia run.",
  "image": { "name": "thumb", "alt": "This Is Lorelei Australia tour poster" },
  "order": 10
}
```

`src/content/graphics/lorelei-uk-europe.json`:

```json
{
  "title": "This Is Lorelei — UK / Europe Tour",
  "slug": "lorelei-uk-europe",
  "category": "tour-poster",
  "artist": "This Is Lorelei",
  "description": "Tour poster for This Is Lorelei's UK and Europe run.",
  "image": { "name": "thumb", "alt": "This Is Lorelei UK/Europe tour poster" },
  "order": 20
}
```

`src/content/graphics/lorelei-knockdown.json`:

```json
{
  "title": "This Is Lorelei — Knockdown Center",
  "slug": "lorelei-knockdown",
  "category": "show-poster",
  "artist": "This Is Lorelei",
  "venue": "Knockdown Center",
  "description": "Show poster for This Is Lorelei at Knockdown Center.",
  "image": { "name": "thumb", "alt": "This Is Lorelei at Knockdown Center poster" },
  "order": 30
}
```

`src/content/graphics/florist-cream-tee.json`:

```json
{
  "title": "Florist — Cream Tee",
  "slug": "florist-cream-tee",
  "category": "merch",
  "artist": "Florist",
  "description": "Merch tee design for Florist — cream colorway.",
  "image": { "name": "thumb", "alt": "Florist cream tee merch" },
  "order": 40
}
```

`src/content/graphics/florist-red-tee.json`:

```json
{
  "title": "Florist — Red Tee",
  "slug": "florist-red-tee",
  "category": "merch",
  "artist": "Florist",
  "description": "Merch tee design for Florist — red colorway.",
  "image": { "name": "thumb", "alt": "Florist red tee merch" },
  "order": 50
}
```

`src/content/graphics/susannah-joffe-poster.json`:

```json
{
  "title": "Susannah Joffe — Show Poster",
  "slug": "susannah-joffe-poster",
  "category": "show-poster",
  "artist": "Susannah Joffe",
  "description": "Show poster for Susannah Joffe.",
  "image": { "name": "thumb", "alt": "Susannah Joffe show poster" },
  "order": 60
}
```

`src/content/graphics/horses-cant-outrun-me.json`:

```json
{
  "title": "Horses Can't Outrun Me — Poster",
  "slug": "horses-cant-outrun-me",
  "category": "show-poster",
  "description": "Poster for Horses Can't Outrun Me.",
  "image": { "name": "thumb", "alt": "Horses Can't Outrun Me poster" },
  "order": 70
}
```

`src/content/graphics/cella-typography.json`:

```json
{
  "title": "CELLA — Typography Variations",
  "slug": "cella-typography",
  "category": "typography",
  "description": "Custom CELLA wordmark variations — yellow, red, and bubble treatments.",
  "image": { "name": "thumb", "alt": "CELLA custom typography variations" },
  "order": 80
}
```

`src/content/graphics/carter-ward-l-train.json`:

```json
{
  "title": "Carter Ward — L Train, WNYU",
  "slug": "carter-ward-l-train",
  "category": "radio-poster",
  "artist": "Carter Ward",
  "venue": "WNYU",
  "description": "Radio poster for Carter Ward's L Train appearance on WNYU.",
  "image": { "name": "thumb", "alt": "Carter Ward L Train WNYU radio poster" },
  "order": 90
}
```

`src/content/graphics/april-play-typography.json`:

```json
{
  "title": "April Play — Typography",
  "slug": "april-play-typography",
  "category": "typography",
  "description": "Custom April Play typography treatment.",
  "image": { "name": "thumb", "alt": "April Play typography" },
  "order": 100
}
```

`src/content/graphics/mta-waveform.json`:

```json
{
  "title": "MTA — Waveform",
  "slug": "mta-waveform",
  "category": "other",
  "description": "MTA Waveform design.",
  "image": { "name": "thumb", "alt": "MTA Waveform design" },
  "order": 110
}
```

`src/content/graphics/truth-club-running.json`:

```json
{
  "title": "Truth Club — Running From The Chase",
  "slug": "truth-club-running",
  "category": "promo",
  "artist": "Truth Club",
  "description": "Promo graphic and press layout for Truth Club's \"Running From The Chase.\"",
  "image": { "name": "thumb", "alt": "Truth Club Running From The Chase promo" },
  "pressQuotes": [],
  "order": 120
}
```

`src/content/graphics/allegra-krieger-campaign.json`:

```json
{
  "title": "Allegra Krieger — Campaign Collage",
  "slug": "allegra-krieger-campaign",
  "category": "campaign",
  "artist": "Allegra Krieger",
  "description": "Campaign collage with press quotes for Allegra Krieger.",
  "image": { "name": "thumb", "alt": "Allegra Krieger campaign collage" },
  "pressQuotes": [],
  "order": 130
}
```

`src/content/graphics/been-stellar-flyer.json`:

```json
{
  "title": "Been Stellar — Angel Flyer",
  "slug": "been-stellar-flyer",
  "category": "flyer",
  "artist": "Been Stellar",
  "description": "Angel-emoji motif flyer for Been Stellar.",
  "image": { "name": "thumb", "alt": "Been Stellar angel flyer" },
  "order": 140
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/graphics
git commit -m "$(cat <<'EOF'
Populate Graphics collection (13 entries)

Tour posters (Lorelei), merch (Florist), show posters (Susannah
Joffe, Horses Can't Outrun Me), radio (Carter Ward / WNYU),
typography (CELLA, April Play), MTA Waveform, Truth Club promo,
Allegra Krieger campaign, Been Stellar flyer. Press quotes are
empty arrays for now — Copilot adds them during sync.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 14: Populate Videos collection (2 entries)

**Files:**
- Create: `src/content/videos/tucson-music-video.json`
- Create: `src/content/videos/babehoven-wnyu-live.json`

- [ ] **Step 1: Write Tucson**

```json
{
  "title": "Tucson — Nara's Room",
  "slug": "tucson-music-video",
  "year": 2026,
  "role": "Director",
  "artist": "Nara's Room",
  "description": "Music video for Nara's Room — \"Tucson.\" Directed by Cella Raiteri.",
  "thumbnail": { "name": "thumb", "alt": "Tucson music video still" },
  "embedUrl": "https://www.youtube.com/embed/placeholder-tucson",
  "embedProvider": "youtube",
  "links": [
    { "label": "YouTube", "url": "https://www.youtube.com/watch?v=placeholder-tucson" }
  ],
  "order": 10
}
```

- [ ] **Step 2: Write Babehoven WNYU Live**

```json
{
  "title": "Babehoven — WNYU Live",
  "slug": "babehoven-wnyu-live",
  "year": 2025,
  "role": "Graphics, Filming, Editing",
  "artist": "Babehoven",
  "description": "Live session for Babehoven at WNYU. Graphics, filming, and editing.",
  "thumbnail": { "name": "thumb", "alt": "Babehoven WNYU Live still" },
  "embedUrl": "https://player.vimeo.com/video/placeholder-babehoven",
  "embedProvider": "vimeo",
  "order": 20
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/videos
git commit -m "$(cat <<'EOF'
Populate Videos collection — Tucson (2026), Babehoven WNYU (2025)

Both use embedUrl; Cella swaps placeholders for the real
YouTube/Vimeo IDs during Copilot sync.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 15: Data-driven Projects index page

**Files:**
- Modify: `src/pages/projects.astro` (full rewrite)

- [ ] **Step 1: Rewrite projects.astro**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
import { resolveImage } from '~/lib/images';

const projects = (await getCollection('projects'))
  .sort((a, b) => a.data.order - b.data.order);
---

<BaseLayout title="Projects — CELLA" activePage="projects">
  <section class="page-hero">
    <h1>Projects</h1>
  </section>

  <ul class="projects-index">
    {projects.map((p) => {
      const thumb = resolveImage(p.data.slug, p.data.thumbnail.name, {
        alt: p.data.thumbnail.alt,
        sizes: '(max-width: 767px) 100vw, 50vw',
      });
      return (
        <li class="project-card">
          <a href={`/projects/${p.data.slug}`}>
            <img
              src={thumb.src}
              srcset={thumb.srcset}
              sizes={thumb.sizes}
              width={thumb.width}
              height={thumb.height}
              alt={thumb.alt}
              loading="lazy"
              decoding="async"
            />
            <h2>{p.data.title}</h2>
            {p.data.tagline && <p class="tagline">{p.data.tagline}</p>}
            <p class="meta">{p.data.category.replace('-', ' ')} · {p.data.years.join('–')}</p>
          </a>
        </li>
      );
    })}
  </ul>
</BaseLayout>

<style lang="scss">
  .page-hero {
    padding: 12rem 2rem 2rem;
    max-width: 900px;

    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(3rem, 8vw, 5rem);
      margin: 0;
    }
  }

  .projects-index {
    list-style: none;
    padding: 2rem 2rem 6rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2.5rem;
  }

  .project-card {
    a {
      display: block;
      color: inherit;
      text-decoration: none;
    }

    img {
      width: 100%;
      height: auto;
      display: block;
    }

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 1.5rem;
      margin: 0.75rem 0 0.25rem;
    }

    .tagline {
      font-size: 0.9rem;
      margin: 0 0 0.25rem;
    }

    .meta {
      font-size: 0.75rem;
      color: var(--color-muted, #666);
      text-transform: capitalize;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/projects.astro
git commit -m "$(cat <<'EOF'
Make Projects index data-driven from collection

Cards render from getCollection('projects'), sorted by order,
each thumbnail resolved through the image manifest.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 16: Data-driven Graphics index page

**Files:**
- Modify: `src/pages/graphics.astro` (full rewrite)

- [ ] **Step 1: Rewrite graphics.astro**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
import { resolveImage } from '~/lib/images';

const graphics = (await getCollection('graphics'))
  .sort((a, b) => a.data.order - b.data.order);
---

<BaseLayout title="Graphics — CELLA" activePage="graphics">
  <section class="page-hero">
    <h1>Graphics</h1>
  </section>

  <ul class="graphics-grid">
    {graphics.map((g) => {
      const img = resolveImage(g.data.slug, g.data.image.name, {
        alt: g.data.image.alt,
        sizes: '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw',
      });
      return (
        <li class="graphic-card">
          <figure>
            <img
              src={img.src}
              srcset={img.srcset}
              sizes={img.sizes}
              width={img.width}
              height={img.height}
              alt={img.alt}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <strong>{g.data.title}</strong>
              {g.data.year && <span class="year"> · {g.data.year}</span>}
              {g.data.artist && <span class="artist"> · {g.data.artist}</span>}
            </figcaption>
          </figure>
        </li>
      );
    })}
  </ul>
</BaseLayout>

<style lang="scss">
  .page-hero {
    padding: 12rem 2rem 2rem;
    max-width: 900px;

    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(3rem, 8vw, 5rem);
      margin: 0;
    }
  }

  .graphics-grid {
    list-style: none;
    padding: 2rem 2rem 6rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2rem;
  }

  .graphic-card {
    figure { margin: 0; }
    img { width: 100%; height: auto; display: block; }

    figcaption {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--color-muted, #666);

      strong { color: var(--color-text, #1a1a1a); font-weight: normal; }
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/graphics.astro
git commit -m "$(cat <<'EOF'
Make Graphics index data-driven from collection

Grid renders from getCollection('graphics'), each entry's
primary image resolved through the manifest.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 17: Data-driven Video index page

**Files:**
- Modify: `src/pages/video.astro` (full rewrite)

- [ ] **Step 1: Rewrite video.astro**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
import { resolveImage } from '~/lib/images';

const videos = (await getCollection('videos'))
  .sort((a, b) => a.data.order - b.data.order);
---

<BaseLayout title="Video — CELLA" activePage="video">
  <section class="page-hero">
    <h1>Video</h1>
  </section>

  <ul class="video-list">
    {videos.map((v) => {
      const thumb = resolveImage(v.data.slug, v.data.thumbnail.name, {
        alt: v.data.thumbnail.alt,
        sizes: '(max-width: 767px) 100vw, 66vw',
      });
      const href = v.data.embedUrl ?? v.data.videoFile!;
      return (
        <li class="video-card">
          <a href={href} rel="noopener">
            <img
              src={thumb.src}
              srcset={thumb.srcset}
              sizes={thumb.sizes}
              width={thumb.width}
              height={thumb.height}
              alt={thumb.alt}
              loading="lazy"
              decoding="async"
            />
          </a>
          <div class="meta">
            <h2>{v.data.title}</h2>
            <p class="role">{v.data.role} · {v.data.year}</p>
            {v.data.artist && <p class="artist">{v.data.artist}</p>}
            {v.data.description && <p class="description">{v.data.description}</p>}
          </div>
        </li>
      );
    })}
  </ul>
</BaseLayout>

<style lang="scss">
  .page-hero {
    padding: 12rem 2rem 2rem;
    max-width: 900px;

    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(3rem, 8vw, 5rem);
      margin: 0;
    }
  }

  .video-list {
    list-style: none;
    padding: 2rem 2rem 6rem;
    display: grid;
    gap: 4rem;
    max-width: 1100px;
  }

  .video-card {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }

    img { width: 100%; height: auto; display: block; }

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }

    .role, .artist {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      margin: 0 0 0.25rem;
    }

    .description {
      font-size: 0.9rem;
      margin: 0.5rem 0 0;
    }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/video.astro
git commit -m "$(cat <<'EOF'
Make Video index data-driven from collection

List renders from getCollection('videos'), thumbnails link out
to embed URL or local videoFile.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 18: Data-driven About page

**Files:**
- Modify: `src/pages/about.astro` (full rewrite)

- [ ] **Step 1: Rewrite about.astro**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import { getEntry } from 'astro:content';
import { resolveImage, hasImage } from '~/lib/images';

const about = await getEntry('about', 'about');
if (!about) throw new Error('src/content/about.json is required');
const { bio, contact, software, opennessStatement, portrait } = about.data;

const portraitImg = portrait && hasImage('about', portrait.name)
  ? resolveImage('about', portrait.name, { alt: portrait.alt, sizes: '(max-width: 767px) 100vw, 40vw' })
  : null;
---

<BaseLayout title="About — CELLA" activePage="about">
  <section class="about">
    <div class="about-col">
      <h1>About</h1>
      {bio.map((p) => <p class="bio-para">{p}</p>)}

      <h2>Contact</h2>
      <ul class="contact">
        <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
        <li><a href={contact.instagramUrl} rel="noopener">@{contact.instagram}</a></li>
      </ul>

      <h2>Software</h2>
      <p class="software-lead">Proficient:</p>
      <ul class="software">{software.proficient.map((s) => <li>{s}</li>)}</ul>
      <p class="software-lead">Learning:</p>
      <ul class="software">{software.learning.map((s) => <li>{s}</li>)}</ul>

      <p class="openness">{opennessStatement}</p>
    </div>

    {portraitImg && (
      <div class="about-portrait">
        <img
          src={portraitImg.src}
          srcset={portraitImg.srcset}
          sizes={portraitImg.sizes}
          width={portraitImg.width}
          height={portraitImg.height}
          alt={portraitImg.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
    )}
  </section>
</BaseLayout>

<style lang="scss">
  .about {
    padding: 12rem 2rem 6rem;
    max-width: 1100px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 4rem;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  h1 {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: clamp(3rem, 8vw, 5rem);
    margin: 0 0 2rem;
  }

  h2 {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 1.25rem;
    margin: 2.5rem 0 0.75rem;
  }

  .bio-para {
    font-size: 1.05rem;
    line-height: 1.6;
    margin: 0 0 1rem;
  }

  .contact, .software {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    line-height: 1.8;
  }

  .software-lead {
    font-size: 0.9rem;
    margin: 0.5rem 0 0.25rem;
    font-weight: bold;
  }

  .openness {
    margin-top: 2.5rem;
    font-style: italic;
    color: var(--color-muted, #666);
  }

  .about-portrait img {
    width: 100%;
    height: auto;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/about.astro
git commit -m "$(cat <<'EOF'
Make About page data-driven from about.json singleton

Reads bio paragraphs, contact, software, openness statement,
and optional portrait from the about collection.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 19: Double Double Whammy bespoke detail page (template)

**Purpose:** Template that Halliday Carpender and Rose Bud Thorn copy. Renders description, sub-section blocks, gallery, press quotes, links — all sourced from the collection entry.

**Files:**
- Create: `src/pages/projects/double-double-whammy.astro`

- [ ] **Step 1: Write the page**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import Gallery from '~/components/Gallery.astro';
import PressQuotes from '~/components/PressQuotes.astro';
import { getEntry } from 'astro:content';
import { resolveImage, hasImage } from '~/lib/images';

const project = await getEntry('projects', 'double-double-whammy');
if (!project) throw new Error('Missing content/projects/double-double-whammy.json');
const d = project.data;

const hero = d.hero && hasImage(d.slug, d.hero.name)
  ? resolveImage(d.slug, d.hero.name, { alt: d.hero.alt, sizes: '100vw' })
  : resolveImage(d.slug, d.thumbnail.name, { alt: d.thumbnail.alt, sizes: '100vw' });
---

<BaseLayout title={`${d.title} — CELLA`} activePage="projects">
  <article class="project">
    <header class="project-hero">
      <h1>{d.title}</h1>
      {d.tagline && <p class="tagline">{d.tagline}</p>}
      <p class="meta">
        {d.category.replace('-', ' ')} · {d.years.join('–')} · {d.role}
      </p>
      <img
        src={hero.src}
        srcset={hero.srcset}
        sizes={hero.sizes}
        width={hero.width}
        height={hero.height}
        alt={hero.alt}
        loading="eager"
      />
      <p class="description">{d.description}</p>
      {d.artists.length > 0 && (
        <p class="artists"><strong>Artists:</strong> {d.artists.join(' · ')}</p>
      )}
    </header>

    {d.subSections.map((section) => (
      <section class="project-section" id={section.id}>
        <h2>{section.title}</h2>
        {section.description && <p class="section-desc">{section.description}</p>}
        {section.artists.length > 0 && (
          <p class="section-artists">{section.artists.join(' · ')}</p>
        )}
        {section.images.length > 0 && (
          <Gallery slug={d.slug} images={section.images} columns={3} />
        )}
      </section>
    ))}

    {d.pressQuotes.length > 0 && <PressQuotes quotes={d.pressQuotes} />}

    {d.links.length > 0 && (
      <nav class="project-links">
        {d.links.map((l) => (
          <a href={l.url} rel="noopener">{l.label} →</a>
        ))}
      </nav>
    )}
  </article>
</BaseLayout>

<style lang="scss">
  .project {
    padding: 8rem 2rem 6rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .project-hero {
    margin-bottom: 4rem;

    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(2.5rem, 6vw, 4rem);
      margin: 0 0 0.5rem;
    }

    .tagline { font-size: 1.15rem; margin: 0 0 0.5rem; }
    .meta {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      text-transform: capitalize;
      margin: 0 0 2rem;
    }

    img {
      width: 100%;
      height: auto;
      margin-bottom: 2rem;
    }

    .description { font-size: 1.05rem; line-height: 1.6; margin: 0 0 1rem; }
    .artists { font-size: 0.9rem; color: var(--color-muted, #666); }
  }

  .project-section {
    margin-bottom: 4rem;

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 2rem;
      margin: 0 0 0.75rem;
    }

    .section-desc { margin: 0 0 0.5rem; font-size: 1rem; }
    .section-artists {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      margin: 0 0 1.5rem;
    }
  }

  .project-links {
    display: flex;
    gap: 1.5rem;
    font-size: 0.9rem;
    margin-top: 2rem;

    a:hover { opacity: 0.6; }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/projects/double-double-whammy.astro
git commit -m "$(cat <<'EOF'
Add Double Double Whammy bespoke detail page (template)

Renders hero, sub-sections (Graphics/Merch, Press Sites, Motion),
press quotes, and links from the collection entry. Used as the
template for Halliday Carpender and Rose Bud Thorn.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 20: Halliday Carpender and Rose Bud Thorn detail pages

**Purpose:** Copy the DDW template for the remaining two projects. They use a simpler layout — no sub-sections populated yet — but the same component contract, so verify-content passes.

**Files:**
- Create: `src/pages/projects/halliday-carpender.astro`
- Create: `src/pages/projects/rose-bud-thorn.astro`

- [ ] **Step 1: Write halliday-carpender.astro**

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import Gallery from '~/components/Gallery.astro';
import PressQuotes from '~/components/PressQuotes.astro';
import { getEntry } from 'astro:content';
import { resolveImage, hasImage } from '~/lib/images';

const project = await getEntry('projects', 'halliday-carpender');
if (!project) throw new Error('Missing content/projects/halliday-carpender.json');
const d = project.data;

const hero = d.hero && hasImage(d.slug, d.hero.name)
  ? resolveImage(d.slug, d.hero.name, { alt: d.hero.alt, sizes: '100vw' })
  : resolveImage(d.slug, d.thumbnail.name, { alt: d.thumbnail.alt, sizes: '100vw' });
---

<BaseLayout title={`${d.title} — CELLA`} activePage="projects">
  <article class="project">
    <header class="project-hero">
      <h1>{d.title}</h1>
      {d.tagline && <p class="tagline">{d.tagline}</p>}
      <p class="meta">
        {d.category.replace('-', ' ')} · {d.years.join('–')} · {d.role}
      </p>
      <img
        src={hero.src}
        srcset={hero.srcset}
        sizes={hero.sizes}
        width={hero.width}
        height={hero.height}
        alt={hero.alt}
        loading="eager"
      />
      <p class="description">{d.description}</p>
    </header>

    {d.subSections.map((section) => (
      <section class="project-section" id={section.id}>
        <h2>{section.title}</h2>
        {section.description && <p class="section-desc">{section.description}</p>}
        {section.images.length > 0 && (
          <Gallery slug={d.slug} images={section.images} columns={2} />
        )}
      </section>
    ))}

    {d.pressQuotes.length > 0 && <PressQuotes quotes={d.pressQuotes} />}
  </article>
</BaseLayout>

<style lang="scss">
  .project { padding: 8rem 2rem 6rem; max-width: 1000px; margin: 0 auto; }
  .project-hero {
    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(2.5rem, 6vw, 4rem);
      margin: 0 0 0.5rem;
    }
    .tagline { font-size: 1.1rem; margin: 0 0 0.5rem; }
    .meta {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      text-transform: capitalize;
      margin: 0 0 2rem;
    }
    img { width: 100%; height: auto; margin-bottom: 2rem; }
    .description { font-size: 1.05rem; line-height: 1.6; }
  }
  .project-section {
    margin-top: 3rem;

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 1.75rem;
      margin: 0 0 0.75rem;
    }
    .section-desc { margin: 0 0 1.5rem; }
  }
</style>
```

- [ ] **Step 2: Write rose-bud-thorn.astro** — same as above but use `getEntry('projects', 'rose-bud-thorn')` and `throw new Error('Missing content/projects/rose-bud-thorn.json')`. Everything else is identical.

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro';
import Gallery from '~/components/Gallery.astro';
import PressQuotes from '~/components/PressQuotes.astro';
import { getEntry } from 'astro:content';
import { resolveImage, hasImage } from '~/lib/images';

const project = await getEntry('projects', 'rose-bud-thorn');
if (!project) throw new Error('Missing content/projects/rose-bud-thorn.json');
const d = project.data;

const hero = d.hero && hasImage(d.slug, d.hero.name)
  ? resolveImage(d.slug, d.hero.name, { alt: d.hero.alt, sizes: '100vw' })
  : resolveImage(d.slug, d.thumbnail.name, { alt: d.thumbnail.alt, sizes: '100vw' });
---

<BaseLayout title={`${d.title} — CELLA`} activePage="projects">
  <article class="project">
    <header class="project-hero">
      <h1>{d.title}</h1>
      {d.tagline && <p class="tagline">{d.tagline}</p>}
      <p class="meta">
        {d.category.replace('-', ' ')} · {d.years.join('–')} · {d.role}
      </p>
      <img
        src={hero.src}
        srcset={hero.srcset}
        sizes={hero.sizes}
        width={hero.width}
        height={hero.height}
        alt={hero.alt}
        loading="eager"
      />
      <p class="description">{d.description}</p>
    </header>

    {d.subSections.map((section) => (
      <section class="project-section" id={section.id}>
        <h2>{section.title}</h2>
        {section.description && <p class="section-desc">{section.description}</p>}
        {section.images.length > 0 && (
          <Gallery slug={d.slug} images={section.images} columns={2} />
        )}
      </section>
    ))}

    {d.pressQuotes.length > 0 && <PressQuotes quotes={d.pressQuotes} />}
  </article>
</BaseLayout>

<style lang="scss">
  .project { padding: 8rem 2rem 6rem; max-width: 1000px; margin: 0 auto; }
  .project-hero {
    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: clamp(2.5rem, 6vw, 4rem);
      margin: 0 0 0.5rem;
    }
    .tagline { font-size: 1.1rem; margin: 0 0 0.5rem; }
    .meta {
      font-size: 0.85rem;
      color: var(--color-muted, #666);
      text-transform: capitalize;
      margin: 0 0 2rem;
    }
    img { width: 100%; height: auto; margin-bottom: 2rem; }
    .description { font-size: 1.05rem; line-height: 1.6; }
  }
  .project-section {
    margin-top: 3rem;

    h2 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 1.75rem;
      margin: 0 0 0.75rem;
    }
    .section-desc { margin: 0 0 1.5rem; }
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects/halliday-carpender.astro src/pages/projects/rose-bud-thorn.astro
git commit -m "$(cat <<'EOF'
Add Halliday Carpender and Rose Bud Thorn detail pages

Copies the DDW template. Pairing check now satisfied for all
three content/page pairs.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 21: AGENTS.md — Copilot sync instructions

**Purpose:** One document at the repo root that teaches Copilot how to take a Readymag URL + Issue note and land a valid PR. This is the most load-bearing authoring work in the plan: get this wrong and Copilot opens bad PRs in a loop.

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write AGENTS.md**

```markdown
# AGENTS.md — Copilot Sync Instructions

## Project at a glance

This is Cella Raiteri's portfolio site, an Astro 6 static site rebuilt from
`celladome.com` (currently on Readymag). Readymag is the visual source of
truth; this repo is the production site. Cella is not a developer — she
updates Readymag, then opens a GitHub Issue, and you (Copilot) produce a PR
that brings the Astro site closer to the current Readymag design.

- Repo: `github.com/ashrocket/cellasite`
- Design spec: `docs/superpowers/specs/2026-04-12-cellasite-zine-design.md`
- Current plan history: `docs/superpowers/plans/`

## How an Issue becomes a PR

1. Cella opens an Issue. It contains a Readymag URL and some natural-language
   notes ("I updated the projects page — sync this", "make the header match",
   "new video added — use the Vimeo link").
2. You scrape the Readymag URL and extract:
   - Page title / slug
   - Images (their CDN URLs)
   - Text content (headings, paragraphs, pull quotes)
   - Sub-section structure (Readymag "widgets" map roughly to Astro components)
3. You diff what you found against the current Astro site:
   - `src/content/{projects,graphics,videos}/*.json` for metadata
   - `src/pages/projects/<slug>.astro` for bespoke layouts
   - `public/media/<slug>/raw/` for raw images
4. You produce a PR that either adds a new entry, updates an existing entry,
   or adjusts a bespoke page layout. The PR triggers a Cloudflare Pages
   preview URL.
5. Cella reviews the preview on her phone, then merges or opens a follow-up
   Issue with more direction.

Iterative convergence is normal and expected. One Issue does not need to
produce a finished page.

## Readymag structure notes

- Readymag project: `4798196`
- Asset CDN root: `c-p.rmcdn.net`
- Pages on celladome.com correspond roughly to `/projects`, `/graphics`,
  `/video`, `/about`. Sub-pages (individual projects) live under
  `/projects/<slug>`.
- Readymag "widgets" you will encounter:
  - Text widget → becomes a paragraph or heading in the `.astro` page or
    a field in the collection JSON
  - Image widget → becomes a raw image in `public/media/<slug>/raw/` plus
    an `imageRef` in the JSON
  - Gallery widget → becomes a `<Gallery>` component invocation with an
    array of `imageRef`s
  - Pull quote / press quote → goes in the `pressQuotes` array
  - Link / button → goes in the `links` array
  - Video embed → sets `embedUrl` and `embedProvider`; never download the
    video file unless explicitly asked

## Repo layout you must respect

```
src/
  content.config.ts              # Zod schemas — source of truth for JSON shape
  content/
    projects/<slug>.json         # one file per project
    graphics/<slug>.json         # one file per graphic
    videos/<slug>.json           # one file per video
    about.json                   # singleton
  pages/
    projects/<slug>.astro        # one bespoke page per project (required)
    projects.astro               # data-driven index
    graphics.astro               # data-driven index
    video.astro                  # data-driven index
    about.astro                  # reads about.json
  components/
    Gallery.astro                # shared primitive — use this for image rows
    PressQuotes.astro            # shared primitive — use this for press blocks
  lib/
    images.ts                    # resolveImage(slug, name) — always use this
    images-manifest.json         # generated; do not hand-edit
public/
  media/<slug>/raw/*.{jpg,png,webp}  # raw sources, committed
  media/<slug>/<name>-{400,800,1600}w.webp  # generated, gitignored
scripts/
  image-pipeline.mjs             # run via `npm run images`
  verify-content.mjs             # run via `npm run verify`
  verify-images.mjs              # run via `npm run verify`
```

## Rules — read these before writing code

### Content model

- **Do not put free-form markdown in JSON.** Every field has a defined Zod
  type in `src/content.config.ts`. If you need a field that doesn't exist,
  ask in an Issue comment.
- **Filename === slug.** `src/content/projects/foo.json` must have
  `"slug": "foo"`. The filename is the canonical ID. `verify-content` will
  block the build otherwise.
- **Every project JSON requires a matching bespoke page.** If you add
  `src/content/projects/foo.json`, you must also add
  `src/pages/projects/foo.astro`. Copy `double-double-whammy.astro` as the
  template and swap the `getEntry` slug.
- **About is a singleton**, not a collection folder. It lives at
  `src/content/about.json`, not `src/content/about/*.json`. The file must be
  a single-item array: `[{ "slug": "about", ... }]`. The slug is fixed to
  `"about"` (enforced by Zod `z.literal('about')`). The array-of-one shape
  is required by Astro's `file()` loader.

### Images

- **Put raw files in `public/media/<slug>/raw/`.** Lowercase kebab-case
  filenames (`hero.jpg`, `merch-cream-tee.png`). Use `jpg`, `png`, or `webp`
  — no gif, no svg, no heic.
- **Never commit the generated `-400w.webp` / `-800w.webp` / `-1600w.webp`
  variants.** They are produced by `scripts/image-pipeline.mjs` and are
  gitignored. Commit raw sources only.
- **Reference images by logical name in JSON**, never by path. Example:
  ```json
  "thumbnail": { "name": "hero", "alt": "Double Double Whammy hero collage" }
  ```
  The `resolveImage(slug, name)` helper in `src/lib/images.ts` turns the
  logical name into a `<img>` with `src`/`srcset`/`sizes`/`width`/`height`
  attributes.
- **Alt text is required and non-empty.** Copy the visual intent from the
  Readymag page. If there's no context, describe the image literally.
- **After adding raw images, run `npm run images`** to regenerate variants
  and the manifest. Commit the regenerated `src/lib/images-manifest.json`.

### Videos

- **Prefer embed URLs over local video files.** YouTube/Vimeo/VEVO embed
  URLs go in `embedUrl` and `embedProvider`.
- **If Cella specifically asks you to self-host a video**, place the file at
  `public/media/<slug>/video.mp4`, set `videoFile: "/media/<slug>/video.mp4"`
  in the JSON, and leave `embedUrl`/`embedProvider` unset. The schema
  enforces XOR between the two.

### PR conventions

- **Title:** short, imperative — e.g. `Sync Readymag: update Double Double
  Whammy Press Sites` or `Sync Readymag: add Susannah Joffe poster`.
- **Body must include:**
  - Link to the originating Issue
  - Link to the Readymag URL scraped
  - A short list of what changed (which files, which slugs)
  - Any ambiguity you resolved with a default — so Cella can correct it
- **Scope:** one Issue, one PR. If an Issue requires changes across multiple
  projects, split the work unless the Issue explicitly asks for atomic
  changes.
- **Commits:** squash-merge on merge. Individual commits inside the PR should
  be small and focused. Include a trailing line: `Co-Authored-By: Cella
  Raiteri <cellaraiteri@gmail.com>`.

### Verification you must run before opening a PR

```
npm run images      # regenerate variants + manifest
npm run check       # astro type-check
npm run lint        # eslint
npm run verify      # verify-content + verify-images
npm run build       # full build
```

All five must succeed. If any fail, fix the cause — do not "work around" by
editing the verify scripts.

### Ambiguity — when to act vs. ask

Act without asking when:
- A new image has obvious alt text from context
- Readymag text matches existing JSON schema fields 1:1
- A sub-section already exists in the JSON and the update is additive

Ask in an Issue comment when:
- A Readymag widget doesn't have a clear JSON equivalent (e.g. an animation,
  an interactive embed)
- Alt text for an image is not inferable from context
- The Readymag page restructures in a way that would require deleting or
  renaming a slug (slug changes break external links)
- A press quote's source is ambiguous (e.g. a tweet with no attribution
  metadata)

### What you must not do

- Do not modify `src/layouts/BaseLayout.astro`, `src/components/Nav.astro`,
  or anything under `src/styles/nav.scss` without an explicit Issue request.
  The nav is visually load-bearing (see spec Section 1) and the shell is
  out of scope for content sync.
- Do not add new dependencies. If you think you need one, open an Issue.
- Do not downgrade Astro or any other package.
- Do not commit generated artefacts (`dist/`, `.astro/`, `.cache/`,
  `public/media/**/*-{400,800,1600}w.webp`).
- Do not edit `src/content.config.ts` to relax a schema so your PR passes.
  Fix the data instead.

## Quickstart checklist for a "add a new graphic" Issue

1. Create `public/media/<slug>/raw/thumb.<ext>` from the Readymag asset.
2. Create `src/content/graphics/<slug>.json` matching the Zod schema.
3. Run `npm run images` to generate variants and update the manifest.
4. Run `npm run verify && npm run check && npm run build`.
5. Open PR; wait for Cloudflare Pages preview URL; share in PR body.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "$(cat <<'EOF'
Add AGENTS.md — Copilot Readymag sync instructions

Covers Issue→PR flow, repo layout, content model rules, image
pipeline rules, video handling, PR conventions, required
verification steps, and when to ask vs act.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 22: Update Playwright smoke tests for populated pages

**Files:**
- Modify: `tests/e2e/foundation.spec.ts`

- [ ] **Step 1: Append CMS-specific tests**

Append to `tests/e2e/foundation.spec.ts` (keep the existing tests):

```ts
test.describe('CMS content renders', () => {
  test('projects index renders three project cards', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('.project-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.getByText('Double Double Whammy')).toBeVisible();
    await expect(cards.getByText('Halliday Carpender')).toBeVisible();
    await expect(cards.getByText('Rose Bud Thorn')).toBeVisible();
  });

  test('graphics index renders 13 graphic cards', async ({ page }) => {
    await page.goto('/graphics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.graphic-card')).toHaveCount(13);
  });

  test('video index renders two videos', async ({ page }) => {
    await page.goto('/video');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.video-card')).toHaveCount(2);
    await expect(page.getByText('Tucson — Nara\'s Room')).toBeVisible();
    await expect(page.getByText('Babehoven — WNYU Live')).toBeVisible();
  });

  test('about page renders bio + contact + openness', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'About' })).toBeVisible();
    await expect(page.getByText('cellaraiteri@gmail.com')).toBeVisible();
    await expect(page.getByText('thecelladome', { exact: false })).toBeVisible();
    await expect(page.getByText('Currently open to', { exact: false })).toBeVisible();
  });

  test('double-double-whammy detail page renders sub-sections', async ({ page }) => {
    await page.goto('/projects/double-double-whammy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Double Double Whammy' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Graphics & Merch' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Press Sites' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Motion' })).toBeVisible();
  });

  test('halliday-carpender detail page renders', async ({ page }) => {
    await page.goto('/projects/halliday-carpender');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Halliday Carpender' })).toBeVisible();
  });

  test('rose-bud-thorn detail page renders', async ({ page }) => {
    await page.goto('/projects/rose-bud-thorn');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Rose Bud Thorn' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test:e2e`
Expected: all existing foundation tests still pass + new CMS tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/foundation.spec.ts
git commit -m "$(cat <<'EOF'
Extend Playwright smoke with CMS-populated page checks

Covers: 3 project cards, 13 graphics cards, 2 videos, about
bio/contact/openness, and all three project detail pages render.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Task 23: Final CMS verification — full build + verify + test

**Purpose:** Confirm the whole pipeline composes: content entries → schema-valid → images resolvable → pages build → tests green.

- [ ] **Step 1: Clean prior manifest and run the pipeline fresh**

```bash
rm -f src/lib/images-manifest.json
npm run images
```

Expected: manifest regenerates with one entry per raw file under
`public/media/<slug>/raw/`.

- [ ] **Step 2: Run verify-content**

Run: `node scripts/verify-content.mjs`
Expected: `[verify-content] OK`.

- [ ] **Step 3: Run verify-images**

Run: `node scripts/verify-images.mjs`
Expected: `[verify-images] OK — N sources, M variants`.

- [ ] **Step 4: Full type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Unit tests**

Run: `npm run test`
Expected: all pass (nav-math, shake-detect, images-manifest, verify-content).

- [ ] **Step 7: Full prebuild + build**

Run: `npm run build`
Expected: `prebuild` runs image-pipeline → verify-content → verify-images (all green), then `astro build` produces `dist/` with pages for `/`, `/projects`, `/graphics`, `/video`, `/about`, `/projects/double-double-whammy`, `/projects/halliday-carpender`, `/projects/rose-bud-thorn`.

- [ ] **Step 8: E2E tests**

Run: `npm run test:e2e`
Expected: all pass.

- [ ] **Step 9: Manual browser check**

Run: `npm run dev`
Open and verify in a browser:
- `http://localhost:4321/projects` — 3 project cards in order (DDW, Halliday, Rose Bud Thorn)
- `http://localhost:4321/projects/double-double-whammy` — hero image + 3 sub-sections visible
- `http://localhost:4321/graphics` — 13 graphic cards in a grid
- `http://localhost:4321/video` — 2 video cards with thumbnails
- `http://localhost:4321/about` — bio paragraphs, contact, software lists, openness statement
- Nav shell still functions across all pages (Plan 1 intact)

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit --allow-empty -m "$(cat <<'EOF'
CMS infrastructure complete — Plan 2 verified

All schemas populated, image pipeline green, verify-content and
verify-images block the build on drift, AGENTS.md ready for
Copilot sync loop.

Co-Authored-By: @ashrocket collective
EOF
)"
```

---

## Self-Review Checklist (for the implementer after completion)

- [ ] All 23 tasks complete and committed
- [ ] `npm run check` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — all unit tests pass
- [ ] `npm run test:e2e` — all e2e tests pass
- [ ] `npm run verify` — verify-content + verify-images both OK
- [ ] `npm run build` — prebuild chain runs cleanly, astro build succeeds
- [ ] Manual browser check (Task 23 Step 9) passes on all pages
- [ ] `AGENTS.md` at repo root is complete (sync flow, repo layout, rules, PR conventions)
- [ ] Every `src/content/projects/<slug>.json` has a matching `src/pages/projects/<slug>.astro`
- [ ] Every image ref in every JSON entry resolves to a manifest entry
- [ ] `src/lib/images-manifest.json` is committed and up-to-date with the raw sources
- [ ] Generated variants (`*-400w.webp`, etc.) are NOT committed (gitignored)
- [ ] Raw sources (`public/media/<slug>/raw/*`) ARE committed
- [ ] `src/content/about.json` exists and satisfies the singleton schema

Blockers intentionally deferred to Plan 3:
- GitHub Actions CI gate (automated review on PR)
- Cloudflare Pages project configuration & build hook
- DNS cutover from Readymag
- Playwright visual-regression screenshot baseline
- Custom cursor (Layer 3 interaction)
- GSAP scroll-driven animations layered on populated content

---

## Next: Plan 3 (CI, Deploy, DNS Cutover, Animation Polish)

After CMS infrastructure is verified and at least one Copilot PR has round-tripped successfully on a preview URL, proceed to a forthcoming `docs/superpowers/plans/YYYY-MM-DD-cellasite-deploy-and-polish.md` for:

- GitHub Actions workflow running type-check / lint / test / e2e / verify / build on every PR
- Playwright visual-regression screenshot baseline with 2% pixel-diff threshold
- Cloudflare Pages project config, build env vars, preview URL comments on PRs
- DNS cutover from Readymag to Cloudflare Pages
- Rollback playbook (git revert → auto-redeploy + DNS revert path)
- Layer 2 scroll-driven animations on populated content (project parallax, graphics masonry stagger, about timeline)
- Layer 3 interaction polish (hand-drawn custom cursor, grid hover, lightbox morph on click)

