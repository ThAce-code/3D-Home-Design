import { expect, test } from '@playwright/test';

test('refraction demo loads, responds to settings, and restores defaults', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/liquid-glass');
  const lens = page.getByTestId('lg-demo-lens');
  await expect(lens).toHaveAttribute('data-lg-mode', 'refract');
  await page.getByRole('button', { name: '参数', exact: true }).click();
  const panel = page.getByTestId('lg-demo-settings');
  await panel.getByRole('switch', { name: '边缘折射', exact: true }).click();
  await expect(lens).toHaveAttribute('data-lg-mode', 'frost');
  await expect(panel.getByTestId('lg-demo-support')).toContainText('已关闭');
  await panel.getByRole('switch', { name: '边缘折射', exact: true }).click();
  await panel.getByRole('slider', { name: '折射强度' }).fill('64');
  await expect(lens.locator('feDisplacementMap').first()).toHaveAttribute('scale', '64');
  await panel.getByRole('button', { name: '恢复默认' }).click();
  await expect(lens.locator('feDisplacementMap').first()).toHaveAttribute('scale', '36');
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(lens).toHaveAttribute('data-lg-mode', 'refract');
  expect(errors).toEqual([]);
});

test('lens drags, controls support keyboard selection and navbar adapts', async ({ page }) => {
  await page.goto('/liquid-glass');
  const nav = page.getByTestId('lg-demo-nav');
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  const expanded = (await nav.boundingBox())!.width;
  const lens = page.getByTestId('lg-demo-lens');
  await lens.scrollIntoViewIfNeeded();
  const before = (await lens.boundingBox())!;
  await page.mouse.move(before.x + 80, before.y + 80);
  await page.mouse.down();
  await page.mouse.move(before.x + 20, before.y + 130, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await lens.boundingBox())!.x).toBeLessThan(before.x - 30);
  await expect.poll(async () => (await nav.boundingBox())!.width).toBeLessThan(expanded - 100);
  const radio = page.getByRole('radio', { name: '平面', exact: true });
  await radio.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '3D', exact: true })).toHaveAttribute('aria-checked', 'true');
  const toggle = page.getByRole('switch', { name: '吸附网格', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.locator('#dark').evaluate((element) => element.scrollIntoView());
  await expect(nav).toHaveAttribute('data-lg-tone', 'dark');
});

test('reduced motion disables pointer tracking and landing entrance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/liquid-glass');
  const nav = page.getByTestId('lg-demo-nav');
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  await page.mouse.move(400, 45);
  await page.mouse.move(700, 55, { steps: 10 });
  expect(await nav.evaluate((element) => element.style.getPropertyValue('--lg-angle'))).toBe('');
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('h1')).toHaveCSS('transform', 'none');
});

test('unsupported engine takes the frost fallback path', async ({ browser }) => {
  // Exercises our fallback branch; this does not claim native WebKit rendering acceptance.
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Version/18.0 Safari/605.1.15' });
  const page = await context.newPage();
  await page.goto('/liquid-glass');
  await expect(page.getByTestId('lg-demo-lens')).toHaveAttribute('data-lg-mode', 'frost');
  await page.getByRole('button', { name: '参数', exact: true }).click();
  await expect(page.getByTestId('lg-demo-support')).toContainText('兼容模式');
  await context.close();
});

for (const width of [320, 390, 768, 1440]) {
  test(`landing and demo fit viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const brand = (await page.getByTestId('liquid-glass-navbar-brand').boundingBox())!;
    const auth = (await page.getByTestId('liquid-glass-navbar-cta').boundingBox())!;
    expect(brand.x + brand.width).toBeLessThanOrEqual(auth.x);
    const cta = page.getByTestId('liquid-glass-button');
    await expect(cta).toBeVisible();
    const ctaBox = (await cta.boundingBox())!;
    expect(ctaBox.x).toBeGreaterThanOrEqual(0);
    expect(ctaBox.x + ctaBox.width).toBeLessThanOrEqual(width);
    if (width < 1024) {
      await page.getByRole('button', { name: 'Navigation menu' }).click();
      await page.locator('#landing-mobile-menu').getByRole('link', { name: 'Gallery' }).click();
      await expect(page.locator('#landing-mobile-menu')).toHaveCount(0);
    }
    await expect(page.getByTestId('liquid-glass-navbar')).toHaveAttribute('data-lg-mode', 'refract');
    await expect(page.getByTestId('liquid-glass-button-surface')).toHaveAttribute('data-lg-mode', 'refract');
    await page.goto('/liquid-glass');
    await expect(page.getByTestId('lg-demo-settings')).toHaveCount(0);
    await page.getByRole('button', { name: '参数', exact: true }).click();
    const settings = (await page.getByTestId('lg-demo-settings').boundingBox())!;
    expect(settings.x).toBeGreaterThanOrEqual(0);
    expect(settings.x + settings.width).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: '收起参数面板' }).click();
    for (const selector of ['[data-testid="lg-demo-nav"]', '[data-testid="lg-demo-lens"]', '#controls [role="radiogroup"]']) {
      const element = page.locator(selector);
      await element.scrollIntoViewIfNeeded();
      const box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
    }
  });
}
