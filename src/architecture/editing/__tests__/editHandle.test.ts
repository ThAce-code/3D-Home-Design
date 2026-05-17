import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import type { ArchitectureSelection } from '../tools';
import { resolveEditHandles } from '../editHandle';

function createSelection(partial: Partial<ArchitectureSelection>): ArchitectureSelection {
  return {
    vertexIds: [],
    wallIds: [],
    zoneIds: [],
    ...partial,
  };
}

function createDocumentWithConnectedWalls() {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = {
    v1: { id: 'v1', x: 0, y: 0 },
    v2: { id: 'v2', x: 4, y: 0 },
    v3: { id: 'v3', x: 4, y: 3 },
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
  };
  document.wallOrder = ['w1', 'w2'];

  return document;
}

describe('resolveEditHandles', () => {
  it('returns endpoint handles for a selected wall', () => {
    const handles = resolveEditHandles(
      createDocumentWithConnectedWalls(),
      createSelection({ wallIds: ['w1'] }),
    );

    expect(handles).toEqual([
      {
        id: 'handle:vertex:v1',
        kind: 'vertex-endpoint',
        position: [0, 0],
        entityId: 'v1',
        entityType: 'vertex',
      },
      {
        id: 'handle:vertex:v2',
        kind: 'vertex-endpoint',
        position: [4, 0],
        entityId: 'v2',
        entityType: 'vertex',
      },
    ]);
  });

  it('deduplicates shared vertices across selected walls', () => {
    const handles = resolveEditHandles(
      createDocumentWithConnectedWalls(),
      createSelection({ wallIds: ['w1', 'w2'] }),
    );

    expect(handles.map((handle) => handle.entityId)).toEqual(['v1', 'v2', 'v3']);
  });

  it('returns no handles for an empty selection', () => {
    expect(resolveEditHandles(createDocumentWithConnectedWalls(), createSelection({}))).toEqual([]);
  });

  it('ignores missing wall ids without throwing', () => {
    expect(
      resolveEditHandles(createDocumentWithConnectedWalls(), createSelection({ wallIds: ['missing'] })),
    ).toEqual([]);
  });
});
