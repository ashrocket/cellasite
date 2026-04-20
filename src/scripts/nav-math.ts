/**
 * Nav button position math.
 *
 * Each button is rendered with `position: absolute; left: 50%` inside the
 * fixed nav shell, then shifted by `margin-left` to match the audit
 * coordinates. Because `left: 50%` anchors the element's LEFT EDGE (not
 * center), `margin-left` equals how far right of viewport-center the button's
 * left edge sits.
 *
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

/**
 * Left-edge offset relative to viewport center.
 * At any viewport, the rendered left edge = viewportWidth/2 + marginLeft.
 */
export function computeMarginLeft(auditX: number): number {
  return auditX - DESIGN_VIEWPORT_CENTER;
}

export function computeButtonRightEdge(button: NavButton, viewportWidth: number): number {
  return viewportWidth / 2 + button.marginLeft + button.width;
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
    marginLeft: computeMarginLeft(598),
  },
  {
    id: 'graphics',
    label: 'GRAPHICS',
    href: '/graphics',
    auditX: 693,
    auditY: 18,
    width: 103,
    height: 58,
    marginLeft: computeMarginLeft(693),
  },
  {
    id: 'video',
    label: 'VIDEO',
    href: '/video',
    auditX: 790,
    auditY: 10,
    width: 97,
    height: 73,
    marginLeft: computeMarginLeft(790),
  },
  {
    id: 'about',
    label: 'ABOUT',
    href: '/about',
    auditX: 882,
    auditY: 11,
    width: 111,
    height: 73,
    marginLeft: computeMarginLeft(882),
  },
] as const;

export const LOGO = {
  auditX: -67,
  auditY: -192,
  width: 274,
  height: 285,
  marginLeft: computeMarginLeft(-67),
} as const;
