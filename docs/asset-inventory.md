# Asset Inventory

Source: `Portfolio_contents/Porfolio Files/Header/` (Cella's hand-drawn PNG
exports, all 3000×3000 master files).

## Nav

| Role | Source file | Destination | CSS box size |
|---|---|---|---|
| PROJECTS | `Work.png` | `public/assets/nav/projects.png` | 103×69 |
| GRAPHICS | `Writing.png` | `public/assets/nav/graphics.png` | 103×58 |
| VIDEO | `Video.png` | `public/assets/nav/video.png` | 97×73 |
| ABOUT | `About.png` | `public/assets/nav/about.png` | 111×73 |
| Logo | `logoport.png` | `public/assets/logo/logo.png` | 274×285 |

## Label discrepancy (flag for Plan 2)

The Portfolio_contents header set contains buttons from an older version of
the nav: `Work` and `Writing`. The current celladome.com nav uses `PROJECTS`
and `GRAPHICS` labels. Cella's hand-drawn style is consistent across both
sets, so the old PNGs serve as placeholder art while we wire the shell.

**Action for Plan 2:** The Copilot sync pipeline should pull current PNGs
from the Readymag CDN (project `4798196`, asset root `c-p.rmcdn.net`) and
replace `projects.png` / `graphics.png` with the up-to-date hand-drawn labels.

## CSS sizing note

All five source PNGs are 3000×3000 masters. The CSS in `src/styles/nav.scss`
scales them to the audit dimensions (see table above). Aspect ratio of the
rendered box is fixed by the CSS width/height values — if the source PNG has
transparent padding around the drawn mark, the visible glyph will be smaller
than the box. That is expected and matches Readymag's own rendering.

## Deferred Checks (see Plan 3)

- Playwright visual regression (screenshot diff vs. `main` baseline) is
  implemented in Plan 3.
- Build-time image URL verification (`scripts/verify-images.mjs`) is
  implemented in Plan 2.
- Content pairing check (`scripts/verify-content.mjs`) is implemented in
  Plan 2.
