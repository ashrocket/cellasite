// @ts-check
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
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

async function sha256(path) {
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}

async function processOne(absRawPath, slug, name, checksum) {
  const outDir = join(MEDIA_ROOT, slug);
  await mkdir(outDir, { recursive: true });

  const image = sharp(absRawPath, { failOn: 'truncated' });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`sharp could not read dimensions for ${absRawPath}`);
  }

  const variants = [];
  for (const width of VARIANT_WIDTHS) {
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
  const manifest = {};

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
      priorEntry.variants.every((v) => existsSync(join(ROOT, 'public', v.path.replace(/^\//, ''))));

    if (!FORCE && priorEntry && priorEntry.rawChecksum === checksum && allVariantsExist) {
      manifest[key] = priorEntry;
      skipped += 1;
      continue;
    }

    manifest[key] = await processOne(absRaw, slug, name, checksum);
    processed += 1;
  }

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
