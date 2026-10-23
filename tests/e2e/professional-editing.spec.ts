import { expect, test, type Page } from '@playwright/test';
import type {} from '../../src/components/canvas/SceneDebugBridge.js';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

// Seed only the document and camera. Every edit below uses native mouse/keyboard
// input against the rendered canvas, rather than invoking editor commands.
async function openRoom(page: Page) {
  await page.goto('/editor');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  const zoneId = await page.evaluate(async () => {
    const debug = window.__architectureDebug!;
    const documentModule = '/src/architecture/domain/document.ts';
    const zonesModule = '/src/architecture/topology/zones.ts';
    const { createEmptyArchitectureDocument } = await import(documentModule);
    const { rebuildZones } = await import(zonesModule);
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
      v3: { id: 'v3', x: 4, y: 3 },
      v4: { id: 'v4', x: 0, y: 3 },
    };
    document.wallOrder = ['w1', 'w2', 'w3', 'w4'];
    document.walls = Object.fromEntries(document.wallOrder.map((id: string, i: number) => [id, {
      id, levelId, startVertexId: `v${i + 1}`, endVertexId: `v${(i + 1) % 4 + 1}`,
      thickness: 0.2, height: 3, kind: 'structural',
    }]));
    const rebuilt = rebuildZones(document);
    debug.replaceDocument(rebuilt);
    debug.markHasEnteredOnce();
    debug.setActiveTool('select');
    debug.setSelection({ vertexIds: [], wallIds: [], zoneIds: [] });
    debug.setCameraPose([2, 12, 1.501], [2, 0, 1.5]);
    return rebuilt.zoneOrder[0] as string;
  });
  await expect(page.getByTestId('lock-overlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.listObjectsByPrefix('wall:').length)).toBe(4);
  return zoneId;
}

async function worldPoint(page: Page, x: number, z: number, height = 0) {
  return page.evaluate(([x, z, height]) => window.__architectureDebug!.projectWorldPoint([x, height, z]), [x, z, height]);
}

async function moveTo(page: Page, x: number, z: number, height = 0) {
  const point = await worldPoint(page, x, z, height);
  await page.mouse.move(point.clientX, point.clientY, { steps: 5 });
  return point;
}

async function clickWall(page: Page, wallId = 'w1', shift = false) {
  // Stay clear of the midpoint handle and the floating dimension label.
  const point = wallId === 'w1' ? [1, 0] : [4, 1];
  if (shift) await page.keyboard.down('Shift');
  await moveTo(page, point[0], point[1], 3);
  const target = await worldPoint(page, point[0], point[1], 3);
  await page.mouse.click(target.clientX, target.clientY);
  if (shift) await page.keyboard.up('Shift');
}

async function startVertexDrag(page: Page) {
  await clickWall(page);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w1']);
  await expect.poll(() => page.evaluate(() => Boolean(window.__architectureDebug!.getObjectSummary('handle:vertex:v1')))).toBe(true);
  const handle = await page.evaluate(() => window.__architectureDebug!.getObjectSummary('handle:vertex:v1'));
  expect(handle).not.toBeNull();
  await moveTo(page, 0, 0, handle!.position[1] + 0.08);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag?.vertexId)).toBe('v1');
}

async function documentState(page: Page) {
  return page.evaluate(() => window.__architectureDebug!.getDocument().document);
}

test('review regression: preserves typed room-name spaces and normalizes only on blur', async ({ page }, testInfo) => {
  const zoneId = await openRoom(page);
  const center = await moveTo(page, 2, 1.5);
  await page.mouse.click(center.clientX, center.clientY);
  const name = page.getByRole('textbox', { name: '房间名称' });
  await name.pressSequentially('  Living room  ');
  await expect(name).toHaveValue('  Living room  ');
  await name.press('Tab');
  await expect(name).toHaveValue('Living room');
  expect((await documentState(page)).zones[zoneId].name).toBe('Living room');
  await page.screenshot({ path: testInfo.outputPath('room-name-spaces.png') });
  await name.fill('   ');
  await name.press('Tab');
  await expect(name).toHaveValue('');
  expect((await documentState(page)).zones[zoneId].name).toBeNull();
  await name.pressSequentially('Living room');
  await name.press('Delete');
  expect((await documentState(page)).wallOrder).toHaveLength(4);
});

test('review regression: Delete removes the selected room and its boundary walls', async ({ page }) => {
  await openRoom(page);
  const center = await moveTo(page, 2, 1.5);
  await page.mouse.click(center.clientX, center.clientY);
  await expect(page.getByTestId('zone-property-panel')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await documentState(page)).wallOrder).toEqual([]);
  expect((await documentState(page)).zoneOrder).toEqual([]);
  await expect(page.getByTestId('zone-property-panel')).toBeHidden();
});

test('review regression: Delete removes every Shift-selected wall', async ({ page }) => {
  await openRoom(page);
  await clickWall(page);
  await clickWall(page, 'w2', true);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w1', 'w2']);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await documentState(page)).wallOrder).toEqual(['w3', 'w4']);
  expect((await documentState(page)).zoneOrder).toEqual([]);
});

for (const target of [[-1.03, 0.04], [0.04, 2.97]]) {
  test(`review regression: disabled snapping keeps vertex drag raw at ${target}`, async ({ page }) => {
    await openRoom(page);
    await page.evaluate(async () => {
      const modulePath = '/src/store/architectureEditorStore.ts';
      const { useArchitectureEditorStore } = await import(modulePath);
      useArchitectureEditorStore.getState().setSnapEnabled(false);
    });
    await startVertexDrag(page);
    await moveTo(page, target[0], target[1]);
    const drag = await page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag!);
    expect(drag.snappedToVertexId).toBeNull();
    expect(drag.currentPosition[0]).toBeCloseTo(target[0], 2);
    expect(drag.currentPosition[1]).toBeCloseTo(target[1], 2);
    await page.mouse.up();
    const vertex = (await documentState(page)).vertices.v1;
    expect(vertex.x).toBeCloseTo(target[0], 2);
    expect(vertex.y).toBeCloseTo(target[1], 2);
    expect((await documentState(page)).wallOrder).toHaveLength(4);
  });
}

test('selects canvas walls with the unlocked pointer and toggles multiselection', async ({ page }) => {
  await openRoom(page);
  await clickWall(page);
  await expect(page.getByTestId('wall-dimension-label:w1')).toHaveText('4.00 m');
  await clickWall(page, 'w2', true);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w1', 'w2']);
  await clickWall(page, 'w1', true);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w2']);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual([]);
});

test('drags an endpoint, previews its dimensions, rebuilds the room and persists the edit', async ({ page }, testInfo) => {
  const zoneId = await openRoom(page);
  await startVertexDrag(page);
  await moveTo(page, -1.02, 0.02);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag?.currentPosition)).toEqual([-1, 0]);
  await expect(page.getByTestId('wall-dimension-label:w1')).toHaveText('5.00 m');
  await page.screenshot({ path: testInfo.outputPath('vertex-drag-preview.png') });
  await page.mouse.up();
  await expect.poll(async () => (await documentState(page)).vertices.v1).toMatchObject({ x: -1, y: 0 });
  expect((await documentState(page)).zoneOrder).toEqual([zoneId]);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().selection.wallIds)).toEqual(['w1', 'w4']);
  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open('home-design-architecture-v1', 1);
    return new Promise<number | undefined>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('documents').objectStore('documents').get('current');
        read.onerror = () => reject(read.error);
        read.onsuccess = () => { resolve(read.result?.vertices.v1?.x); db.close(); };
      };
    });
  })).toBe(-1);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await expect.poll(async () => (await documentState(page)).vertices.v1?.x).toBe(-1);
});

test('cancels a vertex drag with Escape without changing the document', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await startVertexDrag(page);
  await moveTo(page, -1, 0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await documentState(page)).toEqual(before);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag)).toBeNull();
});

test('splits a wall using its visible midpoint handle without losing the room', async ({ page }, testInfo) => {
  const zoneId = await openRoom(page);
  await clickWall(page);
  await expect(page.getByTestId('wall-dimension-label:w1')).toBeVisible();
  const handle = await page.evaluate(() => window.__architectureDebug!.getObjectSummary('handle:midpoint:w1'));
  expect(handle).not.toBeNull();
  const point = await moveTo(page, 2, 0, handle!.position[1] + 0.008);
  const label = await page.getByTestId('wall-dimension-label:w1').boundingBox();
  expect(label).not.toBeNull();
  expect(point.clientY).toBeGreaterThan(label!.y + label!.height + 2);
  await page.mouse.click(point.clientX, point.clientY);
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(5);
  const document = await documentState(page);
  expect(document.zoneOrder).toEqual([zoneId]);
  expect(document.vertices[document.walls.w1.endVertexId]).toMatchObject({ x: 2, y: 0 });
  await page.screenshot({ path: testInfo.outputPath('split-wall.png') });
});

test('moves a wall body while preserving its length and rebuilding adjacent walls', async ({ page }) => {
  const zoneId = await openRoom(page);
  await clickWall(page);
  await moveTo(page, 1, 0, 3);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().wallDrag?.wallId)).toBe('w1');
  await moveTo(page, 1, -1, 3);
  await expect(page.getByTestId('wall-dimension-label:w1')).toHaveText('4.00 m');
  await page.mouse.up();
  const document = await documentState(page);
  expect(document.vertices.v1.x).toBeCloseTo(0, 1);
  expect(document.vertices.v1.y).toBeCloseTo(-1, 1);
  expect(document.vertices.v2.x).toBeCloseTo(4, 1);
  expect(document.vertices.v2.y).toBeCloseTo(-1, 1);
  expect(document.zoneOrder).toEqual([zoneId]);
});

test('accepts precise vertex coordinates after releasing the mouse in numeric mode', async ({ page }, testInfo) => {
  await openRoom(page);
  await startVertexDrag(page);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('vertex-drag-x-input')).toBeFocused();
  await page.mouse.up();
  await page.getByTestId('vertex-drag-x-input').fill('-1.25');
  await page.getByTestId('vertex-drag-y-input').fill('-0.5');
  await page.screenshot({ path: testInfo.outputPath('numeric-vertex-input.png') });
  await page.getByTestId('vertex-drag-y-input').press('Enter');
  await expect.poll(async () => (await documentState(page)).vertices.v1).toMatchObject({ x: -1.25, y: -0.5 });
  await expect(page.getByTestId('vertex-drag-x-input')).toBeHidden();
});

test('accepts precise wall offset after releasing the mouse in numeric mode', async ({ page }) => {
  await openRoom(page);
  await clickWall(page);
  await moveTo(page, 1, 0, 3);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().wallDrag?.wallId)).toBe('w1');
  await page.keyboard.press('Tab');
  await page.mouse.up();
  await page.getByTestId('wall-drag-offset-input').fill('-0.75');
  await page.getByTestId('wall-drag-offset-input').press('Enter');
  await expect.poll(async () => (await documentState(page)).vertices.v1.y).toBe(-0.75);
  expect((await documentState(page)).vertices.v2.y).toBe(-0.75);
  await expect(page.getByTestId('wall-drag-offset-input')).toBeHidden();
});

test('cancels numeric drag input with Escape without committing', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await startVertexDrag(page);
  await page.keyboard.press('Tab');
  await page.mouse.up();
  await page.getByTestId('vertex-drag-x-input').fill('-2');
  await page.getByTestId('vertex-drag-x-input').press('Escape');
  expect(await documentState(page)).toEqual(before);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag)).toBeNull();
});

test('cancels a wall drag without modifying adjacent walls', async ({ page }) => {
  await openRoom(page);
  const before = await documentState(page);
  await clickWall(page);
  await moveTo(page, 1, 0, 3);
  await page.mouse.down();
  await moveTo(page, 1, -1, 3);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await documentState(page)).toEqual(before);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().wallDrag)).toBeNull();
});

test('keeps room properties and updates area after a numeric wall edit', async ({ page }, testInfo) => {
  const zoneId = await openRoom(page);
  const center = await moveTo(page, 2, 1.5);
  await page.mouse.click(center.clientX, center.clientY);
  const panel = page.getByTestId('zone-property-panel');
  await expect(panel).toContainText('12.00 m²');
  await page.getByRole('textbox', { name: '房间名称' }).fill('Living room');
  await page.getByRole('combobox', { name: '房间类型' }).selectOption('living_room');
  await clickWall(page);
  await moveTo(page, 1, 0, 3);
  await page.mouse.down();
  await page.keyboard.press('Tab');
  await page.mouse.up();
  await page.getByTestId('wall-drag-offset-input').fill('-1');
  await page.getByTestId('wall-drag-offset-input').press('Enter');
  await expect.poll(async () => (await documentState(page)).vertices.v1.y).toBe(-1);
  const nextCenter = await moveTo(page, 2, 1);
  await page.mouse.click(nextCenter.clientX, nextCenter.clientY);
  await expect(panel).toContainText('16.00 m²');
  await expect(page.getByRole('textbox', { name: '房间名称' })).toHaveValue('Living room');
  expect((await documentState(page)).zones[zoneId]).toMatchObject({ name: 'Living room', kind: 'living_room' });
  await page.screenshot({ path: testInfo.outputPath('edited-room-properties.png') });
});

test('draws a wall with a typed length using the building tools', async ({ page }) => {
  await openRoom(page);
  await page.keyboard.press('1');
  await page.getByRole('button', { name: '墙体', exact: true }).click();
  const start = await moveTo(page, 6, 0);
  await page.mouse.click(start.clientX, start.clientY);
  await moveTo(page, 8, 0);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('wall-length-input')).toBeVisible();
  await page.keyboard.type('3.5');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await documentState(page)).wallOrder.length).toBe(5);
  const document = await documentState(page);
  const wall = document.walls[document.wallOrder[4]];
  const a = document.vertices[wall.startVertexId];
  const b = document.vertices[wall.endVertexId];
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(3.5, 5);
  await expect(page.getByTestId('wall-length-input')).toBeHidden();
});

test('can reenter navigation without relocking the pointer on editing clicks', async ({ page }) => {
  await openRoom(page);
  await clickWall(page);
  expect(await page.evaluate(() => Boolean(document.pointerLockElement))).toBe(false);
  await page.getByRole('button', { name: '浏览场景' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
  await page.keyboard.down('Alt');
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(false);
  await expect(page.getByRole('button', { name: '保存设计' })).toBeVisible();
  await page.keyboard.up('Alt');
  await expect.poll(() => page.evaluate(() => Boolean(document.pointerLockElement))).toBe(true);
});

test('snaps an endpoint to another endpoint and repairs the resulting room', async ({ page }) => {
  await openRoom(page);
  await startVertexDrag(page);
  await moveTo(page, 0.04, 2.97);
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag?.snappedToVertexId)).toBe('v4');
  await expect(page.getByTestId('editor-status-hud')).toContainText('吸附到端点');
  await page.mouse.up();
  const document = await documentState(page);
  expect(document.wallOrder).toHaveLength(3);
  expect(document.zoneOrder).toHaveLength(1);
  for (const wall of Object.values(document.walls)) {
    expect(document.vertices[wall.startVertexId]).toBeDefined();
    expect(document.vertices[wall.endVertexId]).toBeDefined();
  }
});

test('keeps endpoint and wall body edits accurate from an oblique camera', async ({ page }, testInfo) => {
  await openRoom(page);
  await page.evaluate(() => window.__architectureDebug!.setCameraPose([7, 10, 9], [2, 0, 1.5]));
  await clickWall(page);
  await moveTo(page, 1, 0, 3);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().wallDrag?.wallId)).toBe('w1');
  await moveTo(page, 1, -1, 3);
  await page.mouse.up();
  await expect.poll(async () => (await documentState(page)).vertices.v1.y).toBe(-1);
  await expect.poll(() => page.evaluate(() => Boolean(window.__architectureDebug!.getObjectSummary('handle:vertex:v1')))).toBe(true);
  await moveTo(page, 0, -1, 0.08);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__architectureDebug!.getEditorState().vertexDrag?.vertexId)).toBe('v1');
  await moveTo(page, -1, -1);
  await page.mouse.up();
  await expect.poll(async () => (await documentState(page)).vertices.v1).toMatchObject({ x: -1, y: -1 });
  await page.screenshot({ path: testInfo.outputPath('oblique-editing.png') });
});
