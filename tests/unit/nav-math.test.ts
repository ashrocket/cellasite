import { describe, expect, it } from 'vitest';
import {
  computeMarginLeft,
  computeButtonRightEdge,
  NAV_BUTTONS,
  DESIGN_VIEWPORT_WIDTH,
} from '~/scripts/nav-math';

describe('nav-math', () => {
  describe('computeMarginLeft', () => {
    it('computes -45.5 for PROJECTS (audit x=598)', () => {
      expect(computeMarginLeft(598)).toBe(-45.5);
    });

    it('computes +49.5 for GRAPHICS (audit x=693)', () => {
      expect(computeMarginLeft(693)).toBe(49.5);
    });

    it('computes +146.5 for VIDEO (audit x=790)', () => {
      expect(computeMarginLeft(790)).toBe(146.5);
    });

    it('computes +238.5 for ABOUT (audit x=882)', () => {
      expect(computeMarginLeft(882)).toBe(238.5);
    });

    it('computes -710.5 for logo bleed (audit x=-67)', () => {
      expect(computeMarginLeft(-67)).toBe(-710.5);
    });
  });

  describe('computeButtonRightEdge', () => {
    it('ABOUT right edge at 768px = 733.5px (34.5px clearance)', () => {
      const about = NAV_BUTTONS.find((b) => b.id === 'about')!;
      expect(computeButtonRightEdge(about, 768)).toBe(733.5);
    });

    it('ABOUT right edge at 1287px = 993px (matches design)', () => {
      const about = NAV_BUTTONS.find((b) => b.id === 'about')!;
      expect(computeButtonRightEdge(about, 1287)).toBe(993);
    });
  });

  describe('NAV_BUTTONS', () => {
    it('has 4 buttons in nav order', () => {
      expect(NAV_BUTTONS.map((b) => b.id)).toEqual(['projects', 'graphics', 'video', 'about']);
    });

    it('design viewport width is 1287', () => {
      expect(DESIGN_VIEWPORT_WIDTH).toBe(1287);
    });
  });
});
