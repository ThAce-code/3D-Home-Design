import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __architectureDebug?: {
      markHasEnteredOnce: () => void;
      setPointerLocked: (value: boolean) => void;
      setAltUnlocked: (value: boolean) => void;
      getDocument: () => {
        document: {
          wallOrder: string[];
          zoneOrder: string[];
        };
      };
      replaceDocument: (document: unknown) => void;
      setCameraPose: (position: [number, number, number], target: [number, number, number]) => void;
      listObjectsByPrefix: (prefix: string) => Array<{
        name: string;
        worldBounds: {
          min: [number, number, number];
          max: [number, number, number];
        } | null;
      }>;
    };
  }
}

test('renders seeded horizontal and vertical walls with expected world bounds', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__architectureDebug));

  await page.evaluate(async () => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    debug.markHasEnteredOnce();
    debug.setPointerLocked(false);
    debug.setAltUnlocked(true);

    const [{ createEmptyArchitectureDocument }, { applyDrawWall }] = await Promise.all([
      import('/src/architecture/domain/document.ts'),
      import('/src/architecture/topology/repair.ts'),
    ]);

    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0.08, 0.04]);
    document = applyDrawWall(document, [6, 0], [10, 0]);

    debug.replaceDocument(document);
    debug.setCameraPose([5, 4, 10], [5, 1.5, 0]);
  });
  await page.waitForTimeout(100);

  const debugData = await page.evaluate(() => {
    const debug = window.__architectureDebug;
    if (!debug) {
      throw new Error('missing architecture debug bridge');
    }

    return {
      wallOrder: debug.getDocument().document.wallOrder,
      zoneOrder: debug.getDocument().document.zoneOrder,
      walls: debug.listObjectsByPrefix('wall:'),
      sceneObjects: debug.listObjectsByPrefix(''),
    };
  });

  console.log('[wall-visual-debug]', JSON.stringify(debugData, null, 2));

  await page.screenshot({
    path: 'test-results/wall-visual-debug.png',
    fullPage: true,
  });

  expect(debugData.zoneOrder).toHaveLength(1);
  expect(debugData.wallOrder.length).toBeGreaterThanOrEqual(5);

  const [firstWall, secondWall, , , fifthWall] = debugData.walls;
  expect(firstWall?.worldBounds).not.toBeNull();
  expect(secondWall?.worldBounds).not.toBeNull();
  expect(fifthWall?.worldBounds).not.toBeNull();

  const firstWallSize = firstWall?.worldBounds
    ? {
      x: firstWall.worldBounds.max[0] - firstWall.worldBounds.min[0],
      y: firstWall.worldBounds.max[1] - firstWall.worldBounds.min[1],
      z: firstWall.worldBounds.max[2] - firstWall.worldBounds.min[2],
    }
    : null;
  const secondWallSize = secondWall?.worldBounds
    ? {
      x: secondWall.worldBounds.max[0] - secondWall.worldBounds.min[0],
      y: secondWall.worldBounds.max[1] - secondWall.worldBounds.min[1],
      z: secondWall.worldBounds.max[2] - secondWall.worldBounds.min[2],
    }
    : null;
  const fifthWallSize = fifthWall?.worldBounds
    ? {
      x: fifthWall.worldBounds.max[0] - fifthWall.worldBounds.min[0],
      y: fifthWall.worldBounds.max[1] - fifthWall.worldBounds.min[1],
      z: fifthWall.worldBounds.max[2] - fifthWall.worldBounds.min[2],
    }
    : null;

  expect(firstWallSize?.x ?? 0).toBeGreaterThan(firstWallSize?.z ?? Number.POSITIVE_INFINITY);
  expect(secondWallSize?.z ?? 0).toBeGreaterThan(secondWallSize?.x ?? Number.POSITIVE_INFINITY);
  expect(fifthWallSize?.x ?? 0).toBeGreaterThan(fifthWallSize?.z ?? Number.POSITIVE_INFINITY);
});
