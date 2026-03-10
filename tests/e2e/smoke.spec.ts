import { expect, test } from '@playwright/test'

test('loads the app shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/3D/)
  await expect(page.locator('#root')).toBeVisible()
})
