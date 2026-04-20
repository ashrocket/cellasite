/**
 * Nav overlay controller — tap logo to toggle, device shake to open.
 */

interface AccelSample {
  x: number;
  y: number;
  z: number;
}

interface ShakeConfig {
  thresholdMps2: number;
  sustainMs: number;
}

export class ShakeDetector {
  private sustainStart: number | null = null;

  constructor(
    private config: ShakeConfig,
    private onShake: () => void,
  ) {}

  onMotion(a: AccelSample, timestamp: number): void {
    const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

    if (magnitude < this.config.thresholdMps2) {
      this.sustainStart = null;
      return;
    }

    if (this.sustainStart === null) {
      this.sustainStart = timestamp;
      return;
    }

    if (timestamp - this.sustainStart >= this.config.sustainMs) {
      this.onShake();
      this.sustainStart = null;
    }
  }
}

export function initNavOverlay(): void {
  if (typeof document === 'undefined') return;

  const overlay = document.getElementById('mobile-nav-overlay');
  const logo = document.querySelector<HTMLAnchorElement>('.nav-logo');
  if (!overlay || !logo) return;

  const toggle = (open: boolean): void => {
    overlay.dataset['open'] = open ? 'true' : 'false';
    overlay.hidden = !open;
  };

  const isMobile = (): boolean => window.matchMedia('(max-width: 767px)').matches;

  logo.addEventListener('click', (e) => {
    if (!isMobile()) return;
    e.preventDefault();
    const open = overlay.dataset['open'] !== 'true';
    toggle(open);
  });

  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === overlay) toggle(false);
  });

  overlay.querySelectorAll<HTMLAnchorElement>('.mobile-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggle(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.dataset['open'] === 'true') toggle(false);
  });

  const shake = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
    if (isMobile()) toggle(true);
  });

  const attachMotion = (): void => {
    window.addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      shake.onMotion({ x: a.x, y: a.y, z: a.z }, e.timeStamp);
    });
  };

  type DeviceMotionEventStatic = typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  const DME = DeviceMotionEvent as DeviceMotionEventStatic;

  if (typeof DME.requestPermission === 'function') {
    const requestOnce = (): void => {
      DME.requestPermission!()
        .then((result) => {
          if (result === 'granted') attachMotion();
        })
        .catch(() => {
          // Graceful degradation — tap-logo still works.
        })
        .finally(() => {
          document.removeEventListener('click', requestOnce);
        });
    };
    document.addEventListener('click', requestOnce, { once: true });
  } else {
    attachMotion();
  }
}
