import { expect, test, type Locator, type Page } from '@playwright/test'

const DB_NAME = 'home-design-v2'
const STORE_NAME = 'state'
const PERSIST_POLL_TIMEOUT_MS = 10_000

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

async function dragOnCanvas(canvas: Locator, start: { x: number; y: number }, end: { x: number; y: number }) {
  const box = await canvas.boundingBox()
  if (!box) {
    throw new Error('canvas not available for drag')
  }

  const startX = box.x + box.width * start.x
  const startY = box.y + box.height * start.y
  const endX = box.x + box.width * end.x
  const endY = box.y + box.height * end.y

  await canvas.page().mouse.move(startX, startY)
  await canvas.page().mouse.down()
  await canvas.page().mouse.move(endX, endY, { steps: 10 })
  await canvas.page().mouse.up()
}

async function getPersistedRoomsCount(page: Page) {
  return await page.evaluate(
    async ({ dbName, storeName }: { dbName: string; storeName: string }) => {
      return await new Promise<number>((resolve, reject) => {
        const request = window.indexedDB.open(dbName, 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(storeName, 'readonly')
          const getRequest = tx.objectStore(storeName).get('current')
          getRequest.onerror = () => reject(getRequest.error)
          getRequest.onsuccess = () => {
            const result = getRequest.result as { rooms?: unknown[] } | undefined
            resolve(Array.isArray(result?.rooms) ? result.rooms.length : 0)
          }
        }
      })
    },
    { dbName: DB_NAME, storeName: STORE_NAME }
  )
}

test('draws a room by dragging on the grid and persists it', async ({ page }) => {
  await resetDb(page)
  await page.goto('/')

  const overlay = page.getByTestId('lock-overlay')
  await overlay.click()
  await expect.poll(() => getCanvasLockState(page)).toBe(true)

  const canvas = page.locator('canvas')
  await dragOnCanvas(canvas, { x: 0.25, y: 0.35 }, { x: 0.75, y: 0.7 })

  await expect.poll(() => getPersistedRoomsCount(page), { timeout: PERSIST_POLL_TIMEOUT_MS }).toBeGreaterThan(0)
})
