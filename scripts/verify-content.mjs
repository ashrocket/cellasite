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
 * @param {any} entry
 * @returns {string[]}
 */
export function extractImageRefs(entry) {
  /** @type {Set<string>} */
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
 * @returns {Promise<string[]>}
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
 * @returns {Promise<string[]>}
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
  /** @type {string[]} */
  const errors = [];

  const projectSlugs = await listJsonSlugs(join(ROOT, 'src/content/projects'));
  const projectPages = await listAstroSlugs(join(ROOT, 'src/pages/projects'));
  const { missingPages, orphanPages } = findDrift({ projectSlugs, projectPages });
  for (const slug of missingPages) {
    errors.push(`projects/${slug}.json exists but src/pages/projects/${slug}.astro is missing`);
  }
  for (const slug of orphanPages) {
    errors.push(
      `src/pages/projects/${slug}.astro exists but src/content/projects/${slug}.json is missing`,
    );
  }

  const aboutPath = join(ROOT, 'src/content/about.json');
  if (!existsSync(aboutPath)) {
    errors.push('src/content/about.json is missing (required by the about collection)');
  }

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

  if (existsSync(aboutPath)) {
    try {
      const aboutRaw = JSON.parse(await readFile(aboutPath, 'utf8'));
      if (!Array.isArray(aboutRaw) || aboutRaw.length !== 1) {
        errors.push(
          'src/content/about.json must be a single-item array: [{ "slug": "about", ... }]',
        );
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
    { name: 'videos', dir: 'src/content/videos' },
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

if (process.argv[1] && process.argv[1].endsWith('verify-content.mjs')) {
  main().catch((err) => {
    console.error('[verify-content] CRASHED');
    console.error(err);
    process.exit(1);
  });
}
