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
