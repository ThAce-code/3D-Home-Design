import { expect, test, type Page } from '@playwright/test'

async function backgroundColorOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor)
}

test('landing first screen uses liquid glass navbar and hero CTA without the demo button', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('landing-nav')).toBeVisible()
  await expect(page.getByTestId('landing-hero')).toContainText('Dream. Realized.')

  const navLaunchButton = page.getByRole('button', { name: 'Sign in / Sign up' }).first()
  const heroPrimaryCta = page.getByRole('button', { name: /Start Designing/i })
  const heroBadge = page.getByText('Next-Gen Spatial Engine', { exact: false }).first()
  const heroLiquidCta = page.getByTestId('liquid-glass-button')
  const liquidNavbar = page.getByTestId('liquid-glass-navbar')
  const liquidNavbarBrand = page.getByTestId('liquid-glass-navbar-brand')
  const liquidNavbarLinks = page.getByTestId('liquid-glass-navbar-links')
  const liquidNavbarCta = page.getByTestId('liquid-glass-navbar-cta')
  const viewDemo = page.getByRole('link', { name: /View Demo/i })

  await expect(navLaunchButton).toBeVisible()
  await expect(heroPrimaryCta).toBeVisible()
  await expect(heroBadge).toBeVisible()
  await expect(liquidNavbar).toBeVisible()
  await expect(liquidNavbarBrand).toBeVisible()
  await expect(liquidNavbarLinks).toBeVisible()
  await expect(liquidNavbarCta).toBeVisible()
  await expect(heroLiquidCta).toBeVisible()
  await expect(viewDemo).toHaveCount(0)
  await expect(liquidNavbarLinks).toContainText('Gallery')
  await expect(liquidNavbarLinks).toContainText('Docs')
  await expect(liquidNavbarLinks).toContainText('Experience')
  await expect(liquidNavbarLinks).toContainText('Studio')

  await heroPrimaryCta.hover()

  const heroShellFillBox = await page.locator('.hero-liquid-glass-button .liquid-glass-hero-cta-shell-fill').boundingBox()
  const heroButtonBox = await heroPrimaryCta.boundingBox()

  expect(heroShellFillBox).not.toBeNull()
  expect(heroButtonBox).not.toBeNull()
  expect(Math.abs((heroShellFillBox?.x ?? 0) - (heroButtonBox?.x ?? 0))).toBeLessThan(1)
  expect(Math.abs((heroShellFillBox?.width ?? 0) - (heroButtonBox?.width ?? 0))).toBeLessThan(1)

  expect(await backgroundColorOf(page, '[data-testid="landing-nav"] button[aria-label="Sign in / Sign up"]')).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await backgroundColorOf(page, '[data-testid="landing-hero"] button:has-text("Start Designing")')).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await heroBadge.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await liquidNavbar.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    'rgb(255, 255, 255)',
  )
})
