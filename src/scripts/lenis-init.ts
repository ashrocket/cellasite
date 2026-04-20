import Lenis from 'lenis';

/**
 * Initialize Lenis on the inner `.content-scroll` wrapper — not the document.
 * The fixed nav sits outside; only main content scrolls.
 */
export function initLenis(): void {
  if (typeof document === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wrapper = document.querySelector<HTMLElement>('main.content-scroll');
  if (!wrapper) return;

  const lenis = new Lenis({
    wrapper,
    content: wrapper,
    smoothWheel: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}
