import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { createWallPropertyStoreController } from '../propertyController';

describe('wall property controller', () => {
  it('reads the latest document and replace handler when patching wall props', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
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
    };
    document.wallOrder = ['w1'];
    document.levels[levelId] = {
      ...level,
      vertexIds: ['v1', 'v2'],
      wallIds: ['w1'],
      zoneIds: [],
    };

    const firstReplaceDocument = vi.fn();
    const latestReplaceDocument = vi.fn();
    let documentState = {
      document: createEmptyArchitectureDocument(),
      replaceDocument: firstReplaceDocument,
    };
    const controller = createWallPropertyStoreController({
      documentStore: {
        getState: () => documentState,
      },
    });

    documentState = {
      document,
      replaceDocument: latestReplaceDocument,
    };

    controller.patchWall('w1', { thickness: 0.42 });

    expect(firstReplaceDocument).not.toHaveBeenCalled();
    expect(latestReplaceDocument).toHaveBeenCalledTimes(1);
    expect(latestReplaceDocument.mock.calls[0]?.[0].walls.w1?.thickness).toBe(0.42);
  });
});
