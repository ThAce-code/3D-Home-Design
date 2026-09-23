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

  const { shellFill, button } = await heroPrimaryCta.evaluate((element) => ({
    shellFill: element.querySelector('.liquid-glass-hero-cta-shell-fill')?.getBoundingClientRect().toJSON(),
    button: element.getBoundingClientRect().toJSON(),
  }))

  expect(shellFill).toBeDefined()
  expect(Math.abs((shellFill?.x ?? 0) - button.x)).toBeLessThan(1)
  expect(Math.abs((shellFill?.width ?? 0) - button.width)).toBeLessThan(1)

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
