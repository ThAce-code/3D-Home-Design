import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { createDefaultViewport } from '../tools';
import {
  createWallDragState,
  getWallDragCommitEffects,
  getWallDragOffsetForPoint,
  getWallDragPreviewPositions,
  resolveWallDragSnap,
} from '../wallDragInteraction';

function createDocumentWithWall() {
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

  return document;
}

describe('wall drag interaction', () => {
  it('creates wall drag state from the selected wall and pointer grab point', () => {
    const drag = createWallDragState({
      document: createDocumentWithWall(),
      wallId: 'w1',
      grabPoint: [2.5, 0],
    });

    expect(drag).toMatchObject({
      wallId: 'w1',
      startVertexId: 'v1',
      endVertexId: 'v2',
      startVertexOrigin: [0, 0],
      endVertexOrigin: [4, 0],
      grabOffset: [0.5, 0],
      currentOffset: [0, 0],
    });
  });

  it('computes raw drag offset from the grab point and current pointer point', () => {
    const drag = createWallDragState({
      document: createDocumentWithWall(),
      wallId: 'w1',
      grabPoint: [2.5, 0],
    });

    expect(drag ? getWallDragOffsetForPoint({ wallDrag: drag, currentPoint: [3.5, 2] }) : null).toEqual([1, 2]);
  });

  it('snaps wall drag offsets to the grid within snap tolerance', () => {
    const result = resolveWallDragSnap({
      rawOffset: [0.96, 0.05],
      viewport: {
        ...createDefaultViewport(),
        gridSize: 1,
        snapTolerance: 0.1,
      },
    });

    expect(result).toEqual([1, 0]);
  });

  it('computes wall preview endpoints from the current offset', () => {
    const drag = createWallDragState({
      document: createDocumentWithWall(),
      wallId: 'w1',
      grabPoint: [2, 0],
    });

    expect(drag ? getWallDragPreviewPositions({
      wallDrag: {
        ...drag,
        currentOffset: [1, 2],
      },
    }) : null).toEqual({
      startPosition: [1, 2],
      endPosition: [5, 2],
    });
  });

  it('builds commands that batch-move both wall endpoints and keep the wall selected', () => {
    const document = createDocumentWithWall();
    const drag = createWallDragState({
      document,
      wallId: 'w1',
      grabPoint: [2, 0],
    });

    const commands = getWallDragCommitEffects({
      document,
      wallDrag: {
        ...drag!,
        currentOffset: [1, 2],
      },
    });

    expect(commands.map((command) => command.type)).toEqual([
      'replace-document',
      'commit-wall-drag',
      'set-selection',
    ]);
    expect(commands[0]?.type).toBe('replace-document');
    if (commands[0]?.type === 'replace-document') {
      expect(commands[0].document.vertices.v1).toMatchObject({ x: 1, y: 2 });
      expect(commands[0].document.vertices.v2).toMatchObject({ x: 5, y: 2 });
    }
    expect(commands[2]).toEqual({
      type: 'set-selection',
      selection: {
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      },
    });
  });
});
