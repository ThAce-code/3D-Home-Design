import { expect, test } from '@playwright/test'

test('landing day/night and locale preferences persist', async ({ page }) => {
  await page.goto('/')
  const pageRoot = page.getByTestId('landing-page')
  await expect(pageRoot).toHaveAttribute('data-landing-appearance', 'day')
  await expect(pageRoot).toHaveAttribute('data-landing-locale', 'en')
  await page.getByTestId('landing-appearance-toggle').click()
  await expect(pageRoot).toHaveAttribute('data-landing-appearance', 'night')
  await expect(page.locator('.landing-night-veil')).toHaveCount(1)
  const isolation = await page.getByTestId('liquid-glass-navbar').evaluate((element) => {
    let node: HTMLElement | null = element
    while (node) {
      const styles = getComputedStyle(node)
      if (styles.isolation === 'isolate' || (styles.filter && styles.filter !== 'none')) {
        return { isolation: styles.isolation, filter: styles.filter, tag: node.tagName }
      }
      node = node.parentElement
    }
    return null
  })
  expect(isolation).toBeNull()
  await page.getByTestId('landing-locale-toggle').click()
  await expect(pageRoot).toHaveAttribute('data-landing-locale', 'zh')
  await expect(page.getByTestId('liquid-glass-button')).toContainText('开始设计')
  await page.reload()
  await expect(page.getByTestId('landing-page')).toHaveAttribute('data-landing-appearance', 'night')
  await expect(page.getByTestId('landing-page')).toHaveAttribute('data-landing-locale', 'zh')
})
