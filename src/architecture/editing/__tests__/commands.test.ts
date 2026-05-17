import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { reduceArchitectureCommand } from '../reducers';

describe('reduceArchitectureCommand', () => {
  it('dispatches DRAW_WALL through the repair pipeline', () => {
    const document = createEmptyArchitectureDocument();

    const next = reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: [0, 0],
      end: [4, 0],
    });

    expect(next.wallOrder).toHaveLength(1);
  });

  it('splits one wall into two walls with a shared midpoint vertex', () => {
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

    const next = reduceArchitectureCommand(document, {
      type: 'SPLIT_WALL',
      wallId: 'w1',
      splitPoint: [2, 0],
    });

    expect(next.wallOrder).toHaveLength(2);
    expect(Object.values(next.vertices)).toHaveLength(3);

    const originalWall = next.walls.w1;
    const newWallId = next.wallOrder.find((wallId) => wallId !== 'w1');
    const newWall = newWallId ? next.walls[newWallId] : null;
    expect(newWall).toBeDefined();

    const midpointVertex = Object.values(next.vertices).find((vertex) => vertex.x === 2 && vertex.y === 0);
    expect(midpointVertex).toBeDefined();
    expect(originalWall.startVertexId).toBe('v1');
    expect(originalWall.endVertexId).toBe(midpointVertex?.id);
    expect(newWall?.startVertexId).toBe(midpointVertex?.id);
    expect(newWall?.endVertexId).toBe('v2');
  });
});
