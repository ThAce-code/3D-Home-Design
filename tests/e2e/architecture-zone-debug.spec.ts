import { expect, test, type Page } from '@playwright/test';

async function getCanvasLockState(page: Page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    return Boolean(canvas && document.pointerLockElement === canvas);
  });
}

declare global {
  interface Window {
    __architectureDebug?: {
      markHasEnteredOnce: () => void;
      setPointerLocked: (value: boolean) => void;
      setAltUnlocked: (value: boolean) => void;
      getDocument: () => {
        document: {
          zoneOrder: string[];
          zones: Record<string, unknown>;
        };
      };
      replaceDocument: (document: unknown) => void;
      setActiveTool: (tool: string) => void;
      setSelection: (selection: { vertexIds: string[]; wallIds: string[]; zoneIds: string[] }) => void;
      getObjectSummary: (name: string) => unknown;
      listObjectsByPrefix: (prefix: string) => unknown[];
      setCameraPose: (position: [number, number, number], target: [number, number, number]) => void;
      projectWorldPoint: (point: [number, number, number]) => { clientX: number; clientY: number };
      raycastAtClient: (clientX: number, clientY: number) => Array<{
        objectName: string;
        objectType: string;
        materialSide: number | null;
        materialTransparent: boolean | null;
        materialOpacity: number | null;
        point: [number, number, number];
      }>;
      getEditorState: () => {
        selection: {
          vertexIds: string[];
          wallIds: string[];
          zoneIds: string[];
        };
      };
    };
  }
}

async function seedRectangleZone(page: Page) {
  return page.evaluate(async () => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    debug.markHasEnteredOnce();
    debug.setPointerLocked(false);
    debug.setAltUnlocked(true);

    const [{ createEmptyArchitectureDocument }, { rebuildZones }] = await Promise.all([
      import('/src/architecture/domain/document.ts'),
      import('/src/architecture/topology/zones.ts'),
    ]);

    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
      v3: { id: 'v3', x: 4, y: 3 },
      v4: { id: 'v4', x: 0, y: 3 },
    };
    document.walls = {
      w1: {
        id: 'w1',
        levelId,
        startVertexId: 'v1',
        endVertexId: 'v2',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      w2: {
        id: 'w2',
        levelId,
        startVertexId: 'v2',
        endVertexId: 'v3',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      w3: {
        id: 'w3',
        levelId,
        startVertexId: 'v3',
        endVertexId: 'v4',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      w4: {
        id: 'w4',
        levelId,
        startVertexId: 'v4',
        endVertexId: 'v1',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['w1', 'w2', 'w3', 'w4'];
    document.levels[levelId] = {
      ...level,
      vertexIds: ['v1', 'v2', 'v3', 'v4'],
      wallIds: ['w1', 'w2', 'w3', 'w4'],
      zoneIds: [],
    };

    const rebuilt = rebuildZones(document);
    debug.replaceDocument(rebuilt);
    debug.setActiveTool('select');
    debug.setSelection({
      vertexIds: [],
      wallIds: ['w1'],
      zoneIds: [],
    });

    const runtimeDocument = debug.getDocument().document;
    console.info('[playwright-debug] runtime-zone-data', JSON.stringify({
      zoneOrder: runtimeDocument.zoneOrder,
      zones: runtimeDocument.zones,
    }));

    return runtimeDocument.zoneOrder[0] ?? null;
  });
}

test('diagnoses zone raycast and selection in a real browser canvas', async ({ page }) => {
  page.on('console', (message) => {
    console.log(`[browser:${message.type()}] ${message.text()}`);
  });

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await page.getByTestId('lock-overlay').click();
  await expect.poll(() => getCanvasLockState(page)).toBe(true);

  const zoneId = await seedRectangleZone(page);
  expect(zoneId).toBeTruthy();

  const zoneTarget = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    debug.setSelection({
      vertexIds: [],
      wallIds: [],
      zoneIds: [],
    });

    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error('missing canvas');
    }

    const rect = canvas.getBoundingClientRect();
    debug.setCameraPose([2, 6, 1.5], [2, 0, 1.5]);
    const zoneObjects = debug.listObjectsByPrefix('zone:');
    const interactionPlane = debug.getObjectSummary('architecture-interaction-plane');
    const floorPlane = debug.getObjectSummary('floor-plane');
    const center = {
      clientX: rect.left + (rect.width / 2),
      clientY: rect.top + (rect.height / 2),
    };
    const hits = debug.raycastAtClient(center.clientX, center.clientY);
    const element = document.elementFromPoint(center.clientX, center.clientY);

    console.info('[playwright-debug] zone-center-click', JSON.stringify({
      zoneObjects,
      interactionPlane,
      floorPlane,
      center,
      hits,
      element: element?.tagName ?? null,
      selection: debug.getEditorState().selection,
    }));

    return {
      clientX: center.clientX,
      clientY: center.clientY,
      hits,
      element: element?.tagName ?? null,
    };
  });

  await page.mouse.move(zoneTarget.clientX, zoneTarget.clientY);
  await page.mouse.down();
  await page.mouse.up();

  const selection = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    const currentSelection = debug.getEditorState().selection;
    console.info('[playwright-debug] post-click-selection', JSON.stringify(currentSelection));
    return currentSelection;
  });

  expect(zoneTarget.hits.length).toBeGreaterThan(0);
  expect(selection.zoneIds).toEqual([zoneId as string]);
  expect(selection.wallIds).toEqual([]);
});

test('keeps zone selectable from an oblique camera even when a far wall is in the raycast stack', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await page.getByTestId('lock-overlay').click();
  await expect.poll(() => getCanvasLockState(page)).toBe(true);

  const zoneId = await seedRectangleZone(page);
  expect(zoneId).toBeTruthy();

  const zoneTarget = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    debug.setSelection({
      vertexIds: [],
      wallIds: [],
      zoneIds: [],
    });
    debug.setCameraPose([2, 6, 7], [2, 0, 1.5]);

    const target = debug.projectWorldPoint([2, 0.01, 1.5]);
    const hits = debug.raycastAtClient(target.clientX, target.clientY);

    return {
      clientX: target.clientX,
      clientY: target.clientY,
      hits,
    };
  });

  expect(zoneTarget.hits.map((hit) => hit.objectName)).toContain(`zone:${zoneId as string}`);
  expect(zoneTarget.hits[0]?.objectName).toMatch(/^wall:/);

  await page.mouse.move(zoneTarget.clientX, zoneTarget.clientY);
  await page.mouse.down();
  await page.mouse.up();

  const selection = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    return debug.getEditorState().selection;
  });

  expect(selection.zoneIds).toEqual([zoneId as string]);
  expect(selection.wallIds).toEqual([]);
});

test('keeps visible wall faces selectable in the unlocked editor camera', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));
  await page.getByTestId('lock-overlay').click();
  await expect.poll(() => getCanvasLockState(page)).toBe(true);

  await seedRectangleZone(page);

  const wallTarget = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    debug.setSelection({
      vertexIds: [],
      wallIds: [],
      zoneIds: [],
    });
    debug.setCameraPose([2, 1.7, 5], [2, 1.5, 0]);

    const target = debug.projectWorldPoint([2, 1.5, 0.1]);
    const hits = debug.raycastAtClient(target.clientX, target.clientY);

    return {
      clientX: target.clientX,
      clientY: target.clientY,
      hits,
    };
  });

  expect(wallTarget.hits[0]?.objectName).toMatch(/^wall:/);

  await page.mouse.move(wallTarget.clientX, wallTarget.clientY);
  await page.mouse.down();
  await page.mouse.up();

  const selection = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    return debug.getEditorState().selection;
  });

  expect(selection.wallIds).toHaveLength(1);
  expect(selection.zoneIds).toEqual([]);
});
