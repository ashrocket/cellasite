import { describe, expect, it } from 'vitest';
// @ts-expect-error JS module, no types file
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
      expect(manifestKey('double-double-whammy', 'hero')).toBe('double-double-whammy/hero');
    });
  });
});
