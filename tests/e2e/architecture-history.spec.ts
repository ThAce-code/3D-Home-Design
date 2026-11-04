import { expect, test, type Page } from '@playwright/test';
import type {} from '../../src/components/canvas/SceneDebugBridge.js';

async function openRoom(page: Page) {
  await page.goto('/editor');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await page.evaluate(async () => {
    const debug = window.__architectureDebug!;
    const documentModule = '/src/architecture/domain/document.ts';
    const zonesModule = '/src/architecture/topology/zones.ts';
    const { createEmptyArchitectureDocument } = await import(documentModule);
    const { rebuildZones } = await import(zonesModule);
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 }, v2: { id: 'v2', x: 4, y: 0 },
      v3: { id: 'v3', x: 4, y: 3 }, v4: { id: 'v4', x: 0, y: 3 },
    };
    document.wallOrder = ['w1', 'w2', 'w3', 'w4'];
    document.walls = Object.fromEntries(document.wallOrder.map((id: string, i: number) => [id, {
      id, levelId, startVertexId: `v${i + 1}`, endVertexId: `v${(i + 1) % 4 + 1}`,
      thickness: 0.2, height: 3, kind: 'structural',
    }]));
    debug.loadDocument(rebuildZones(document));
    debug.markHasEnteredOnce();
    debug.setActiveTool('select');
    debug.setCameraPose([2, 12, 1.501], [2, 0, 1.5]);
  });
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.listObjectsByPrefix('wall:').length)).toBe(4);
}

async function move(page: Page, x: number, z: number, height = 0) {
  const point = await page.evaluate(([x, z, height]) => window.__architectureDebug!.projectWorldPoint([x, height, z]), [x, z, height]);
  await page.mouse.move(point.clientX, point.clientY, { steps: 5 });
  return point;
}

async function click(page: Page, x: number, z: number, height = 0) {
  const point = await move(page, x, z, height);
  await page.mouse.click(point.clientX, point.clientY);
}

async function documentState(page: Page) {
  return page.evaluate(() => window.__architectureDebug!.getDocument().document);
}

async function splitWall(page: Page) {
  await click(page, 1, 0, 3);
  await expect(page.getByTestId('wall-dimension-label:w1')).toBeVisible();
  await click(page, 2, 0, 0.008);
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(5);
}

test('undoes and redoes a split with exact IDs using both keyboard redo aliases', async ({ page }, testInfo) => {
  await openRoom(page);
  const before = await documentState(page);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '重做', exact: true })).toBeDisabled();
  await splitWall(page);
  const split = await documentState(page);
  await page.keyboard.press('Control+z');
  await expect.poll(() => documentState(page)).toEqual(before);
  await page.keyboard.press('Control+Shift+Z');
  await expect.poll(() => documentState(page)).toEqual(split);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+y');
  await expect.poll(() => documentState(page)).toEqual(split);
  await page.screenshot({ path: testInfo.outputPath('history-toolbar.png') });
});

test('records one history step per vertex and wall drag', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await click(page, 1, 0, 3);
  await expect(page.getByTestId('wall-dimension-label:w1')).toBeVisible();
  await move(page, 0, 0, 0.08);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag?.vertexId)).toBe('v1');
  await move(page, -1, 0);
  await page.mouse.up();
  await expect.poll(async () => (await documentState(page)).vertices.v1.x).toBe(-1);
  expect(await page.evaluate(() => window.__architectureDebug!.getDocument().pastDocuments.length)).toBe(1);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => documentState(page)).toEqual(before);
  await click(page, 1, 0, 3);
  await move(page, 1, 0, 3);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().wallDrag?.wallId)).toBe('w1');
  await move(page, 1, -1, 3);
  await page.mouse.up();
  await expect.poll(async () => (await documentState(page)).vertices.v1.y).toBe(-1);
  const moved = await documentState(page);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => documentState(page)).toEqual(before);
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await expect.poll(() => documentState(page)).toEqual(moved);
});

test('coalesces property typing and preserves native input undo', async ({ page }) => {
  await openRoom(page);
  await click(page, 2, 1.5);
  const input = page.getByRole('textbox', { name: '房间名称' });
  await input.pressSequentially('Living room');
  await expect(input).toHaveValue('Living room');
  await click(page, 2, 1.5);
  expect(await page.evaluate(() => window.__architectureDebug!.getDocument().pastDocuments.length)).toBe(1);
  await page.keyboard.press('Control+z');
  await click(page, 2, 1.5);
  await expect(input).toHaveValue('');
  await click(page, 2, 1.5);
  await page.keyboard.press('Control+y');
  await click(page, 2, 1.5);
  await expect(input).toHaveValue('Living room');
  await input.click();
  await input.pressSequentially(' 2');
  await input.press('Control+z');
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.__architectureDebug!.getDocument().futureDocuments.length)).toBe(0);
  expect((await documentState(page)).wallOrder).toHaveLength(4);
});

test('restores deleted walls and room properties as one step', async ({ page }) => {
  await openRoom(page);
  await click(page, 2, 1.5);
  await page.getByRole('textbox', { name: '房间名称' }).fill('Living room');
  await page.getByRole('combobox', { name: '房间类型' }).selectOption('living_room');
  await click(page, 1, 0, 3);
  const before = await documentState(page);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(3);
  await page.keyboard.press('Control+z');
  await expect.poll(() => documentState(page)).toEqual(before);
  await click(page, 2, 1.5);
  await page.getByRole('button', { name: '删除房间' }).click();
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(0);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => documentState(page)).toEqual(before);
});

for (const selection of ['walls', 'zone'] as const) {
  test(`restores keyboard-deleted ${selection} with one exact undo and redo`, async ({ page }) => {
    await openRoom(page);
    await click(page, 2, 1.5);
    await page.getByRole('textbox', { name: '房间名称' }).fill('Living room');
    await page.getByRole('combobox', { name: '房间类型' }).selectOption('living_room');
    if (selection === 'walls') {
      await click(page, 1, 0, 3);
      await page.keyboard.down('Shift');
      await click(page, 4, 1, 3);
      await page.keyboard.up('Shift');
      await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w1', 'w2']);
    } else {
      await click(page, 2, 1.5);
    }
    const before = await documentState(page);
    const depth = await page.evaluate(() => window.__architectureDebug!.getDocument().pastDocuments.length);
    await page.keyboard.press('Delete');
    await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(selection === 'walls' ? 2 : 0);
    const deleted = await documentState(page);
    expect(await page.evaluate(() => window.__architectureDebug!.getDocument().pastDocuments.length)).toBe(depth + 1);
    await page.keyboard.press('Control+z');
    await expect.poll(() => documentState(page)).toEqual(before);
    await page.keyboard.press('Control+y');
    await expect.poll(() => documentState(page)).toEqual(deleted);
  });
}

test('invalidates redo after a new edit branches from an undone state', async ({ page }) => {
  await openRoom(page);
  await splitWall(page);
  await page.keyboard.press('Control+z');
  await click(page, 4, 1, 3);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(3);
  await expect(page.getByRole('button', { name: '重做', exact: true })).toBeDisabled();
  await page.keyboard.press('Control+Shift+Z');
  expect((await documentState(page)).wallOrder).toHaveLength(3);
});

test('cancels an unfinished draw and undoes a completed wall', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await page.keyboard.press('1');
  await page.getByRole('button', { name: '墙体', exact: true }).click();
  await click(page, 6, 0);
  await move(page, 8, 0);
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().draftWall)).toBeNull();
  expect(await documentState(page)).toEqual(before);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  await click(page, 6, 0);
  await click(page, 8, 0);
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(5);
  const completed = await documentState(page);
  await page.keyboard.press('Control+z');
  await expect.poll(() => documentState(page)).toEqual(before);
  await page.keyboard.press('Control+Shift+Z');
  await expect.poll(() => documentState(page)).toEqual(completed);
});

test('persists the undone result and restores it as a fresh history baseline', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await splitWall(page);
  await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: '保存设计' }).click();
  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open('home-design-architecture-v1', 1);
    return new Promise<number>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('documents').objectStore('documents').get('current');
        read.onsuccess = () => { resolve(read.result?.wallOrder.length ?? 0); db.close(); };
        read.onerror = () => reject(read.error);
      };
    });
  })).toBe(4);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await expect.poll(() => documentState(page)).toEqual(before);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '重做', exact: true })).toBeDisabled();
});
