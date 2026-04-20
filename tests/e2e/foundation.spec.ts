import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', name: 'home' },
  { path: '/projects', name: 'projects' },
  { path: '/graphics', name: 'graphics' },
  { path: '/video', name: 'video' },
  { path: '/about', name: 'about' },
] as const;

test.describe('foundation shell', () => {
  for (const { path, name } of pages) {
    test(`${name} renders without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.nav-logo')).toBeVisible();

      const isDesktop = (await page.viewportSize())!.width >= 768;
      const ids = ['projects', 'graphics', 'video', 'about'] as const;
      for (const id of ids) {
        const btn = page.locator(`.nav-btn[data-nav-id="${id}"]`);
        if (isDesktop) {
          await expect(btn).toBeVisible();
        } else {
          await expect(btn).toBeHidden();
        }
      }

      expect(errors).toEqual([]);
    });
  }

  test('nav buttons fit at 768px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const aboutBtn = page.locator('.nav-btn[data-nav-id="about"]');
    const box = await aboutBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThan(768);
    expect(box!.x + box!.width).toBeCloseTo(733.5, 0);
  });

  test('mobile nav overlay toggles on logo tap', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Mobile interaction covered on chromium-mobile');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const overlay = page.locator('#mobile-nav-overlay');
    await expect(overlay).toBeHidden();

    await page.locator('.nav-logo').click();
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('view-transition-name is applied to nav elements', async ({ page }) => {
    await page.goto('/');
    const logoViewName = await page
      .locator('.nav-logo')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('view-transition-name'));
    expect(logoViewName.trim()).toBe('logo');
  });
});
