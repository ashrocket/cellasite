import { describe, expect, it } from 'vitest';
import { ShakeDetector } from '~/scripts/nav-overlay';

describe('ShakeDetector', () => {
  it('does not fire below threshold', () => {
    let fired = false;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fired = true;
    });
    d.onMotion({ x: 5, y: 0, z: 0 }, 0);
    d.onMotion({ x: 5, y: 0, z: 0 }, 250);
    expect(fired).toBe(false);
  });

  it('fires when threshold sustained for 200ms', () => {
    let fired = false;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fired = true;
    });
    d.onMotion({ x: 20, y: 0, z: 0 }, 0);
    d.onMotion({ x: 20, y: 0, z: 0 }, 250);
    expect(fired).toBe(true);
  });

  it('resets when motion drops below threshold', () => {
    let fires = 0;
    const d = new ShakeDetector({ thresholdMps2: 15, sustainMs: 200 }, () => {
      fires += 1;
    });
    d.onMotion({ x: 20, y: 0, z: 0 }, 0);
    d.onMotion({ x: 0, y: 0, z: 0 }, 100);
    d.onMotion({ x: 20, y: 0, z: 0 }, 150);
    d.onMotion({ x: 20, y: 0, z: 0 }, 500);
    expect(fires).toBe(1);
  });
});
