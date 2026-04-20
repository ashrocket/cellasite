import manifest from './images-manifest.json';

export interface ResolvedImage {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
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

const DEFAULT_SIZES = '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw';

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

export function hasImage(slug: string, name: string): boolean {
  return `${slug}/${name}` in MANIFEST;
}
