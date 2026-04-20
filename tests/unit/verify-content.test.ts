import { describe, expect, it } from 'vitest';
import { findDrift, extractImageRefs } from '../../scripts/verify-content.mjs';

describe('verify-content helpers', () => {
  describe('findDrift', () => {
    it('reports content entry without matching page', () => {
      const result = findDrift({
        projectSlugs: ['foo', 'bar'],
        projectPages: ['foo'],
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
      expect(refs.sort()).toEqual(['ddw/hero', 'ddw/merch-1', 'ddw/merch-2', 'ddw/thumb'].sort());
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
