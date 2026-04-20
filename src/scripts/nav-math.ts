/**
 * Nav button position math.
 *
 * The nav is rendered using Readymag's own approach: each button is anchored
 * to the viewport center (`left: 50%`) with a fixed pixel `margin-left` offset.
 * Audit coords were captured at a 1287×749 viewport.
 */

export const DESIGN_VIEWPORT_WIDTH = 1287;
export const DESIGN_VIEWPORT_CENTER = DESIGN_VIEWPORT_WIDTH / 2; // 643.5

export interface NavButton {
  id: 'projects' | 'graphics' | 'video' | 'about';
  label: string;
  href: string;
  auditX: number;
  auditY: number;
  width: number;
  height: number;
  marginLeft: number;
}

export function computeMarginLeft(auditX: number, width: number): number {
  return auditX + width / 2 - DESIGN_VIEWPORT_CENTER;
}

export function computeButtonRightEdge(button: NavButton, viewportWidth: number): number {
  const center = viewportWidth / 2 + button.marginLeft;
  return center + button.width / 2;
}

export const NAV_BUTTONS: readonly NavButton[] = [
  {
    id: 'projects',
    label: 'PROJECTS',
    href: '/projects',
    auditX: 598,
    auditY: 4,
    width: 103,
    height: 69,
    marginLeft: computeMarginLeft(598, 103),
  },
  {
    id: 'graphics',
    label: 'GRAPHICS',
    href: '/graphics',
    auditX: 693,
    auditY: 18,
    width: 103,
    height: 58,
    marginLeft: computeMarginLeft(693, 103),
  },
  {
    id: 'video',
    label: 'VIDEO',
    href: '/video',
    auditX: 790,
    auditY: 10,
    width: 97,
    height: 73,
    marginLeft: computeMarginLeft(790, 97),
  },
  {
    id: 'about',
    label: 'ABOUT',
    href: '/about',
    auditX: 882,
    auditY: 11,
    width: 111,
    height: 73,
    marginLeft: computeMarginLeft(882, 111),
  },
] as const;

export const LOGO = {
  auditX: -67,
  auditY: -192,
  width: 274,
  height: 285,
  marginLeft: computeMarginLeft(-67, 274),
} as const;
