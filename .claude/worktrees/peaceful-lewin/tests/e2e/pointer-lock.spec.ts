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

test('locks pointer on click and unlocks on Alt (first-enter overlay hides after entering once)', async ({ page }) => {
  await resetDb(page)
  await page.goto('/')

  const overlay = page.getByTestId('lock-overlay')
  await expect(overlay).toBeVisible()

  await overlay.click()
  await expect.poll(() => getCanvasLockState(page)).toBe(true)

  await page.keyboard.down('Alt')
  await expect.poll(() => getCanvasLockState(page)).toBe(false)

  await expect(overlay).toBeHidden()
})
