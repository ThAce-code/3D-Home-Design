import { expect, test } from '@playwright/test';

test('day/night has an animated reveal and persists with language across reloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  const root = page.getByTestId('landing-page');
  await expect(root).toHaveAttribute('data-appearance', 'light');
  await page.getByTestId('landing-theme-toggle').click();
  const radii = await page.getByTestId('landing-night-reveal').evaluate(async (element) => {
    const values: number[] = [];
    for (let i = 0; i < 8; i++) {
      await new Promise(requestAnimationFrame);
      values.push(parseFloat(getComputedStyle(element).clipPath.slice(7)));
    }
    return values;
  });
  expect(new Set(radii).size).toBeGreaterThan(1);
  await expect(root).toHaveAttribute('data-appearance', 'dark');
  await expect(page.getByTestId('liquid-glass-navbar')).toHaveAttribute('data-lg-tone', 'dark');
  await expect(page.getByTestId('liquid-glass-button-surface')).toHaveAttribute('data-lg-mode', 'refract');
  const reveal = page.getByTestId('landing-night-reveal');
  await expect.poll(async () => reveal.evaluate(e => parseFloat(getComputedStyle(e).clipPath.slice(7)))).toBeGreaterThan(1000);
  await expect(page.getByTestId('landing-theme-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('landing-language-toggle').click();
  await expect(page.locator('h1')).toContainText('构筑你的');
  await expect(page.getByTestId('liquid-glass-button')).toHaveText('开始设计');
  await expect(page.getByTestId('landing-footer')).toContainText('隐私政策');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.reload();
  await expect(root).toHaveAttribute('data-appearance', 'dark');
  await expect(page.locator('h1')).toContainText('构筑你的');
  await page.getByTestId('landing-language-toggle').click();
  await expect(page.locator('h1')).toContainText('Build Your');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByTestId('landing-theme-toggle').click();
  await expect(root).toHaveAttribute('data-appearance', 'light');
  await expect.poll(async () => reveal.evaluate(e => parseFloat(getComputedStyle(e).clipPath.slice(7)))).toBe(0);
  expect(errors).toEqual([]);
});

test('controls still work when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await page.getByTestId('landing-language-toggle').click();
  await page.getByTestId('landing-theme-toggle').click();
  await expect(page.getByTestId('landing-page')).toHaveAttribute('data-appearance', 'dark');
  await expect(page.getByTestId('liquid-glass-button')).toHaveText('开始设计');
});

test('rapid theme reversals settle correctly and reduced motion is immediate', async ({ page }) => {
  await page.goto('/');
  const button = page.getByTestId('landing-theme-toggle');
  await button.click();
  await button.click();
  await button.click();
  await expect(page.getByTestId('landing-page')).toHaveAttribute('data-appearance', 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('landing-night-reveal')).toHaveCSS('clip-path', /circle\(0px/);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`theme and language controls fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width, height:900});
    await page.goto('/');
    for(const id of ['landing-theme-toggle','landing-language-toggle']) {
      const control=page.getByTestId(id);
      const box=(await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width);
      await control.click();
    }
    await expect(page.getByTestId('landing-page')).toHaveAttribute('data-appearance','dark');
    await expect(page.getByTestId('liquid-glass-button')).toHaveText('开始设计');
    const heading = await page.locator('h1').evaluate(e => {
      const style = getComputedStyle(e);
      return { height: e.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
    });
    expect(heading.lineHeight / heading.fontSize).toBeGreaterThan(1.1);
    expect(heading.height).toBeLessThanOrEqual(heading.lineHeight * 3 + 1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
