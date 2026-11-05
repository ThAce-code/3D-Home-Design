import { expect, test } from '@playwright/test';

test('homepage uses refracting surfaces, keeps them transparent on hover and opens editor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const nav = page.getByTestId('liquid-glass-navbar');
  const surface = page.getByTestId('liquid-glass-button-surface');
  const cta = page.getByRole('button', { name: 'Start Designing', exact: true });
  for (const glass of [nav, surface]) {
    await expect(glass).toHaveAttribute('data-lg-mode', 'refract');
    expect(await glass.evaluate(e => getComputedStyle(e).backdropFilter)).toContain('url(');
    await expect(glass.locator('feDisplacementMap').first()).toHaveAttribute('scale', /32|36/);
  }
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(page.getByTestId('landing-hero')).toContainText('Dream. Realized.');
  const background = await surface.evaluate(e => getComputedStyle(e).backgroundColor);
  await cta.hover();
  await expect(surface).toHaveCSS('background-color', background);
  await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
  await expect.poll(async () => surface.locator('.landing-start-arrow').evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
  await cta.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/editor$/);
  expect(errors).toEqual([]);
});

test('scroll compacts navbar without overlapping links and rebuilds refraction after resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = page.getByTestId('liquid-glass-navbar');
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  const expanded = (await nav.boundingBox())!;
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(nav).toHaveAttribute('data-compact', 'true');
  await expect.poll(async () => Math.round((await nav.boundingBox())!.width)).toBe(900);
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  expect((await nav.boundingBox())!.height).toBeLessThan(expanded.height);
  const brand = (await page.getByTestId('liquid-glass-navbar-brand').boundingBox())!;
  const links = (await page.getByTestId('liquid-glass-navbar-links').boundingBox())!;
  const auth = (await page.getByTestId('liquid-glass-navbar-cta').boundingBox())!;
  expect(brand.x + brand.width).toBeLessThan(links.x);
  expect(links.x + links.width).toBeLessThan(auth.x);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav).toHaveAttribute('data-compact', 'false');
  await expect.poll(async () => Math.round((await nav.boundingBox())!.width)).toBe(1280);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  await page.getByRole('button', { name: 'Navigation menu' }).click();
  await expect(page.locator('#landing-mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#landing-mobile-menu')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Navigation menu' })).toBeFocused();
});

test('CTA compresses on press and returns to rest without competing transforms', async ({ page }) => {
  await page.goto('/');
  const surface = page.getByTestId('liquid-glass-button-surface');
  await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
  const cta = page.getByTestId('liquid-glass-button');
  await cta.hover();
  await page.mouse.down();
  await expect.poll(async () => (await surface.boundingBox())!.height).toBeLessThan(70);
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await expect.poll(async () => Math.round((await surface.boundingBox())!.height)).toBe(72);
  await expect(page).toHaveURL(/\/$/);
});

test('homepage reduced motion keeps glass highlight and hover transforms still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const surface = page.getByTestId('liquid-glass-button-surface');
  const nav = page.getByTestId('liquid-glass-navbar');
  await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
  await page.getByTestId('liquid-glass-button').hover();
  await expect(surface).toHaveCSS('transform', 'none');
  expect(await nav.evaluate(e => e.style.getPropertyValue('--lg-angle'))).toBe('');
  expect(await surface.evaluate(e => e.style.getPropertyValue('--lg-angle'))).toBe('');
  await page.mouse.down();
  await expect(surface).toHaveCSS('transform', 'none');
  await page.mouse.move(0, 0);
  await page.mouse.up();
});

test('homepage frost fallback still offers working navigation', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Version/18.0 Safari/605.1.15' });
  const page = await context.newPage();
  await page.goto('/');
  for (const id of ['liquid-glass-navbar', 'liquid-glass-button-surface']) {
    const surface = page.getByTestId(id);
    await expect(surface).toHaveAttribute('data-lg-mode', 'frost');
    expect(await surface.evaluate(e => getComputedStyle(e).backdropFilter)).toContain('blur(');
  }
  await page.getByRole('button', { name: 'Start Designing', exact: true }).click();
  await expect(page).toHaveURL(/\/editor$/);
  await context.close();
});

// Compare rendered material under identical geometry/backdrop, not just component names.
test('homepage surfaces match the approved lab lens on the same backdrop, before and after scrolling', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1000, height: 800 });
  const sample = async (route: string, id: string, scroll = false) => {
    await page.goto(route);
    if (scroll) await page.evaluate(() => window.scrollTo(0, 400));
    const surface = page.getByTestId(id);
    await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
    await surface.evaluate((element) => {
      const stage = document.createElement('div');
      stage.id = 'material-calibration-stage';
      stage.style.cssText = 'position:fixed;left:20px;top:120px;width:440px;height:240px;z-index:9999;background:repeating-linear-gradient(90deg,#20272b 0 5px,transparent 5px 26px),linear-gradient(120deg,#748985,#d8ba68);';
      document.body.appendChild(stage);
      stage.appendChild(element);
      const sheet = document.createElement('style');
      sheet.textContent = '#material-calibration-stage > .lg {position:absolute!important;left:70px!important;top:68px!important;width:300px!important;height:104px!important;padding:0!important;margin:0!important;transform:none!important;border-radius:32px!important;}';
      document.head.appendChild(sheet);
      const target = element as HTMLElement;
      for (const [key, value] of Object.entries({position:'absolute',left:'70px',top:'68px',width:'300px',height:'104px',padding:'0',margin:'0',transform:'none',borderRadius:'32px'})) {
        const cssKey = key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
        target.style.setProperty(cssKey, value, 'important');
      }
      // Inspect only the material; retain real filter, tint, rim and shadow.
      for (const child of Array.from(element.children)) {
        if (child.tagName.toLowerCase() !== 'svg' && !child.classList.contains('lg-rim') && !child.classList.contains('lg-sheen')) {
          (child as HTMLElement).style.visibility = 'hidden';
        }
      }
    });
    await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
    await expect.poll(async () => surface.locator('filter').getAttribute('width')).toBe('300');
    await expect(surface).toHaveAttribute('data-lg-mode', 'refract');
    const optics = await surface.evaluate((e) => ({
      background: getComputedStyle(e).backgroundColor,
      blur: e.querySelector('feGaussianBlur')?.getAttribute('stdDeviation'),
      scales: Array.from(e.querySelectorAll('feDisplacementMap')).map(n => n.getAttribute('scale')),
      map: e.querySelector('feImage')?.getAttribute('href'),
      saturation: e.querySelector('feColorMatrix[type="saturate"]')?.getAttribute('values'),
    }));
    const shot = await page.locator('#material-calibration-stage').screenshot({
      animations: 'disabled', path: testInfo.outputPath(`${id}${scroll ? '-scrolled' : ''}.png`),
    });
    await testInfo.attach(`${id}${scroll ? '-scrolled' : ''}`, { body: shot, contentType: 'image/png' });
    return { optics, shot };
  };
  const reference = await sample('/liquid-glass', 'lg-demo-reference');
  for (const [id, scroll] of [['liquid-glass-navbar', false], ['liquid-glass-navbar', true], ['liquid-glass-button-surface', false]] as const) {
    const actual = await sample('/', id, scroll);
    expect(actual.optics).toEqual(reference.optics);
    expect(actual.shot.equals(reference.shot), `${id} material pixels differ from the approved lens`).toBe(true);
  }
});

test('refraction is present on first painted frame and throughout navbar resizing', async ({ page }) => {
  await page.addInitScript(() => {
    const samples: string[][] = [];
    (window as unknown as { glassFrames: string[][] }).glassFrames = samples;
    let count = 0;
    const sample = () => {
      const surfaces = document.querySelectorAll<HTMLElement>('[data-testid="liquid-glass-navbar"], [data-testid="liquid-glass-button-surface"]');
      if (surfaces.length) {
        samples.push(Array.from(surfaces).map(e => `${e.dataset.lgMode}:${getComputedStyle(e).backdropFilter.startsWith('url(')}`));
        count++;
      }
      if (count < 240) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/');
  const nav = page.getByTestId('liquid-glass-navbar');
  await expect(nav).toHaveAttribute('data-lg-mode', 'refract');
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(async () => Math.round((await nav.boundingBox())!.width)).toBe(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav).toHaveAttribute('data-compact', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Math.round((await nav.boundingBox())!.width)).toBe(366);
  const frames = await page.evaluate(() => (window as unknown as { glassFrames: string[][] }).glassFrames);
  expect(frames.length).toBeGreaterThan(10);
  expect(frames.flat().every(s => s === 'refract:true'), JSON.stringify(frames.filter(f => f.some(s => s !== 'refract:true')))).toBe(true);
});
