// @ts-check
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'src/lib/images-manifest.json');

async function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(
      '[verify-images] src/lib/images-manifest.json missing — run `npm run images` first',
    );
    process.exit(1);
  }

  /** @type {Record<string, any>} */
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  /** @type {string[]} */
  const errors = [];
  let variantCount = 0;

  for (const [key, entry] of Object.entries(manifest)) {
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
