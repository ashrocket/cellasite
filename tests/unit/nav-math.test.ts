import { describe, expect, it } from 'vitest';
import {
  computeMarginLeft,
  computeButtonRightEdge,
  NAV_BUTTONS,
  DESIGN_VIEWPORT_WIDTH,
} from '~/scripts/nav-math';

describe('nav-math', () => {
  describe('computeMarginLeft', () => {
    it('computes +6 for PROJECTS (audit x=598, w=103)', () => {
      expect(computeMarginLeft(598, 103)).toBe(6);
    });

    it('computes +101 for GRAPHICS (audit x=693, w=103)', () => {
      expect(computeMarginLeft(693, 103)).toBe(101);
    });

    it('computes +195 for VIDEO (audit x=790, w=97)', () => {
      expect(computeMarginLeft(790, 97)).toBe(195);
    });

    it('computes +294 for ABOUT (audit x=882, w=111)', () => {
      expect(computeMarginLeft(882, 111)).toBe(294);
    });

    it('computes -573.5 for logo bleed (audit x=-67, w=274)', () => {
      expect(computeMarginLeft(-67, 274)).toBe(-573.5);
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
