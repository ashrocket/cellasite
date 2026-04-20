// @ts-check
/**
 * Pure helpers for the image pipeline and verifiers.
 *
 * Layout:
 *   public/media/<slug>/raw/<name>.{jpg,png,webp}   ← source art (committed)
 *   public/media/<slug>/<name>-{400,800,1600}w.webp ← generated (gitignored)
 */

export const VARIANT_WIDTHS = /** @type {const} */ ([400, 800, 1600]);
export const SUPPORTED_EXTS = /** @type {const} */ (['jpg', 'jpeg', 'png', 'webp']);

const RAW_RE = /public\/media\/([a-z0-9][a-z0-9-]*)\/raw\/([a-z0-9][a-z0-9-]*)\.([a-z0-9]+)$/;

/**
 * @param {string} rawPath  e.g. "public/media/<slug>/raw/<name>.jpg"
 * @returns {{ slug: string, name: string, ext: string }}
 */
export function parseRawPath(rawPath) {
  const normalized = rawPath.split(/[\\/]+/g).join('/');
  const m = RAW_RE.exec(normalized);
  if (!m) {
    throw new Error(`Expected "public/media/<slug>/raw/<name>.<ext>", got "${rawPath}"`);
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
 * @property {string} rawPath
 * @property {string} rawChecksum
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {Array<{ width: number, path: string }>} variants
 */
