import { expect, test, type Page } from '@playwright/test'

const DB_NAME = 'home-design-architecture-v1'
const STORE_NAME = 'documents'
const PERSIST_POLL_TIMEOUT_MS = 10_000

async function getPersistedWallCount(page: Page) {
  return page.evaluate(
    async ({ dbName, storeName }: { dbName: string; storeName: string }) => {
      return new Promise<number>((resolve, reject) => {
        const request = window.indexedDB.open(dbName, 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(storeName, 'readonly')
          const getRequest = tx.objectStore(storeName).get('current')
          getRequest.onerror = () => reject(getRequest.error)
          getRequest.onsuccess = () => {
            const document = getRequest.result as { wallOrder?: unknown[] } | undefined
            resolve(document?.wallOrder?.length ?? 0)
            db.close()
          }
        }
      })
    },
    { dbName: DB_NAME, storeName: STORE_NAME },
  )
}

test('persists a wall in the architecture document across editor reloads', async ({ page }) => {
  await page.goto('/editor')
  await page.waitForFunction(() => Boolean(window.__architectureDebug))
  await page.evaluate(async () => {
    const debug = window.__architectureDebug
    if (!debug) throw new Error('missing architecture debug bridge')
    const { applyDrawWall } = await import('/src/architecture/topology/repair.ts')
    const document = debug.getDocument().document
    debug.replaceDocument(applyDrawWall(document, [0, 0], [4, 0]))
  })

  await expect.poll(() => getPersistedWallCount(page), { timeout: PERSIST_POLL_TIMEOUT_MS }).toBeGreaterThan(0)
  await page.reload()
  await page.waitForFunction(() => Boolean(window.__architectureDebug))
  await expect.poll(() => page.evaluate(() => window.__architectureDebug?.getDocument().document.wallOrder.length ?? 0)).toBe(1)
})
