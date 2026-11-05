import { expect, test, type Page } from '@playwright/test'

const DB_NAME = 'home-design-v2'

async function resetDb(page: Page) {
  await page.addInitScript((name: string) => {
    window.indexedDB.deleteDatabase(name)
  }, DB_NAME)
}

async function getCanvasLockState(page: Page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')
    return Boolean(canvas && document.pointerLockElement === canvas)
  })
}

test('shows updated flight hint after toggling flying mode', async ({ page }) => {
  await resetDb(page)
  await page.goto('/')

  await page.getByTestId('lock-overlay').click()
  await expect.poll(() => getCanvasLockState(page)).toBe(true)

  await page.keyboard.press('f')

  const flyIndicator = page.getByTestId('fly-indicator')
  await expect(flyIndicator).toContainText('Shift 下降')
})
