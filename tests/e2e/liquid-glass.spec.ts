import { expect, test } from '@playwright/test'

test('lazy /liquid-glass demo route renders shared surfaces', async ({ page }) => {
  await page.goto('/liquid-glass')
  await expect(page.getByTestId('liquid-glass-demo')).toBeVisible()
  await expect(page.getByTestId('demo-glass-panel')).toBeVisible()
  await expect(page.getByTestId('demo-glass-navbar')).toBeVisible()
  await expect(page.getByTestId('demo-glass-cta')).toBeVisible()
  await page.getByTestId('demo-appearance-toggle').click()
  await expect(page.getByTestId('liquid-glass-demo')).toHaveAttribute('data-landing-appearance', 'night')
  await page.getByTestId('demo-refraction-toggle').click()
  await expect(page.getByTestId('demo-refraction-toggle')).toContainText('Refraction: off')
})
