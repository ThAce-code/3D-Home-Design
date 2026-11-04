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
  const liquidNavbarLinks = page.getByTestId('liquid-glass-navbar-links')
  await expect(navLaunchButton).toBeVisible()
  await expect(heroPrimaryCta).toBeVisible()
  await expect(heroBadge).toBeVisible()
  await expect(liquidNavbar).toBeVisible()
  await expect(liquidNavbarLinks).toBeVisible()
  await expect(heroLiquidCta).toBeVisible()
  await expect(page.getByRole('link', { name: /View Demo/i })).toHaveCount(0)
  await expect(liquidNavbarLinks).toContainText('Gallery')
  await expect(heroLiquidCta.locator('.liquid-glass-cta-arrow')).toBeVisible()
  const wrapperFilter = await heroLiquidCta.evaluate((element) => {
    const wrapper = element.closest('.liquid-glass-wrapper') as HTMLElement | null
    return wrapper ? getComputedStyle(wrapper).filter : 'missing'
  })
  expect(wrapperFilter === 'none' || wrapperFilter === 'missing').toBeTruthy()
  expect(await backgroundColorOf(page, '[data-testid="landing-nav"] button[aria-label="Sign in / Sign up"]')).not.toBe('rgba(0, 0, 0, 0)')
  expect(await liquidNavbar.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgb(255, 255, 255)')
})

test('navbar contracts after scroll with hysteresis bounds', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByTestId('landing-nav')
  await expect(nav).toHaveAttribute('data-nav-compact', 'false')
  await page.evaluate(() => window.scrollTo(0, 140))
  await expect(nav).toHaveAttribute('data-nav-compact', 'true', { timeout: 3000 })
  await page.evaluate(() => window.scrollTo(0, 80))
  await expect(nav).toHaveAttribute('data-nav-compact', 'true')
  await page.evaluate(() => window.scrollTo(0, 20))
  await expect(nav).toHaveAttribute('data-nav-compact', 'false', { timeout: 3000 })
})
