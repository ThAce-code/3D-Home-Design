import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { createDefaultViewport } from '../tools';
import {
  getVertexDragCommitEffects,
  resolveVertexDragSnap,
} from '../vertexDragInteraction';

function createDocumentWithVertices() {
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

describe('vertex drag interaction', () => {
  it('snaps to another endpoint while excluding the dragged vertex', () => {
    const result = resolveVertexDragSnap({
      document: createDocumentWithVertices(),
      dragVertexId: 'v1',
      rawPoint: [3.95, 0.04],
      viewport: {
        ...createDefaultViewport(),
        snapTolerance: 0.15,
      },
    });

    expect(result).toEqual({
      point: [4, 0],
      snappedToVertexId: 'v2',
    });
  });

  it('snaps to the grid when no endpoint is within tolerance', () => {
    const result = resolveVertexDragSnap({
      document: createDocumentWithVertices(),
      dragVertexId: 'v1',
      rawPoint: [2.04, 1.96],
      viewport: {
        ...createDefaultViewport(),
        gridSize: 1,
        snapTolerance: 0.1,
      },
    });

    expect(result).toEqual({
      point: [2, 2],
      snappedToVertexId: null,
    });
  });

  it('builds commands that move the vertex and end the drag', () => {
    const document = createDocumentWithVertices();
    const commands = getVertexDragCommitEffects({
      document,
      vertexId: 'v1',
      targetPosition: [2, 2],
    });

    expect(commands.map((command) => command.type)).toEqual([
      'replace-document',
      'commit-vertex-drag',
      'set-selection',
    ]);
    expect(commands[0]?.type).toBe('replace-document');
    if (commands[0]?.type === 'replace-document') {
      expect(commands[0].document.vertices.v1).toMatchObject({ x: 2, y: 2 });
    }
  });
});
