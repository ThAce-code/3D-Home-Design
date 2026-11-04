import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { createDefaultViewport } from '../tools';
import {
  createOffsetDragState,
  getOffsetDistance,
  getOffsetDragCommitEffects,
  getOffsetDragOffsetForPoint,
  getWallNormal,
  offsetWallByDistance,
  projectOffsetOntoNormal,
  resolveOffsetDragSnap,
} from '../offsetInteraction';

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

describe('offsetInteraction', () => {
  it('projects free offsets onto the wall normal', () => {
    expect(projectOffsetOntoNormal([2, 3], [0, 1])).toEqual([0, 3]);
    expect(getWallNormal([0, 0], [4, 0])).toEqual([0, 1]);
  });

  it('creates offset drag state in offset mode', () => {
    const drag = createOffsetDragState({
      document: createDocumentWithWall(),
      wallId: 'w1',
      grabPoint: [2, 0],
    });

    expect(drag).toMatchObject({
      wallId: 'w1',
      mode: 'offset',
      currentOffset: [0, 0],
    });
  });

  it('constrains pointer movement to the parallel normal', () => {
    const drag = createOffsetDragState({
      document: createDocumentWithWall(),
      wallId: 'w1',
      grabPoint: [2, 0],
    });

    expect(drag ? getOffsetDragOffsetForPoint({
      wallDrag: drag,
      currentPoint: [5, 2],
    }) : null).toEqual([0, 2]);
  });

  it('snaps offset distances to the grid', () => {
    expect(resolveOffsetDragSnap({
      distance: 0.96,
      viewport: {
        ...createDefaultViewport(),
        gridSize: 1,
        snapTolerance: 0.1,
      },
    })).toBe(1);
  });

  it('offsets a wall by a typed distance and commits through replace-document', () => {
    const document = createDocumentWithWall();
    const next = offsetWallByDistance(document, 'w1', 2);

    expect(next?.vertices.v1).toMatchObject({ x: 0, y: 2 });
    expect(next?.vertices.v2).toMatchObject({ x: 4, y: 2 });

    const drag = createOffsetDragState({
      document,
      wallId: 'w1',
      grabPoint: [2, 0],
    });
    const commands = getOffsetDragCommitEffects({
      document,
      wallDrag: {
        ...drag!,
        currentOffset: [0, 1.5],
      },
    });

    expect(getOffsetDistance({ ...drag!, currentOffset: [0, 1.5] })).toBe(1.5);
    expect(commands.map((command) => command.type)).toEqual([
      'replace-document',
      'commit-wall-drag',
      'set-selection',
    ]);
  });
});
