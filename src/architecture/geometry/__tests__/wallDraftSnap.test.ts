import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../domain/document';
import { armWallTool, createDefaultWallToolState, updateWallToolModifiers } from '../../editing/wallTool';
import { createDefaultViewport, type DraftWallState } from '../../editing/tools';
import { resolveWallDraftSnap } from '../wallDraftSnap';
import { findNearestWallIdByFootprint } from '../wallSelection';

function createDraftWall(startPoint: [number, number]): DraftWallState {
  return {
    startPoint,
    currentPoint: startPoint,
    snappedVertexId: null,
  };
}

function createDocumentWithVerticesAndWall(): ArchitectureDocument {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = {
    v1: { id: 'v1', x: 2.2, y: 1.9 },
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

  return document;
}

describe('resolveWallDraftSnap', () => {
  it('prefers endpoint snapping over grid snapping', () => {
    const document = createDocumentWithVerticesAndWall();
    const viewport = {
      ...createDefaultViewport(),
      gridSize: 1,
      snapTolerance: 0.35,
    };

    const result = resolveWallDraftSnap({
      document,
      draftWall: createDraftWall([0, 0]),
      rawPoint: [2.24, 1.88],
      viewport,
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(result.reason).toBe('endpoint');
    expect(result.point).toEqual([2.2, 1.9]);
    expect(result.snappedVertexId).toBe('v1');
  });

  it('prefers an explicit closure candidate over a free endpoint', () => {
    const result = resolveWallDraftSnap({
      document: createEmptyArchitectureDocument(),
      draftWall: createDraftWall([0, 0]),
      rawPoint: [0.04, -0.03],
      viewport: {
        ...createDefaultViewport(),
        snapTolerance: 0.1,
      },
      wallTool: armWallTool(createDefaultWallToolState()),
    });

    expect(result.reason).toBe('closure');
    expect(result.point).toEqual([0, 0]);
    expect(result.closureCandidate?.vertexId).toBe('draft-start');
  });

  it('projects to a strict horizontal or vertical segment while Shift is held', () => {
    const result = resolveWallDraftSnap({
      document: createEmptyArchitectureDocument(),
      draftWall: createDraftWall([0, 0]),
      rawPoint: [3, 1],
      viewport: createDefaultViewport(),
      wallTool: updateWallToolModifiers(armWallTool(createDefaultWallToolState()), { shiftKey: true }),
    });

    expect(result.reason).toBe('axis-lock');
    expect(result.point).toEqual([3, 0]);
    expect(result.axisLock).toBe('horizontal');
  });

  it('bypasses snapping while Alt is held', () => {
    const document = createDocumentWithVerticesAndWall();
    const result = resolveWallDraftSnap({
      document,
      draftWall: createDraftWall([0, 0]),
      rawPoint: [2.24, 1.88],
      viewport: {
        ...createDefaultViewport(),
        snapTolerance: 0.35,
      },
      wallTool: updateWallToolModifiers(armWallTool(createDefaultWallToolState()), { altKey: true }),
    });

    expect(result.reason).toBe('free');
    expect(result.point).toEqual([2.24, 1.88]);
    expect(result.snappedVertexId).toBeNull();
  });
});

describe('findNearestWallIdByFootprint', () => {
  it('keeps visible wall face selection routed to the wall footprint', () => {
    const document = createDocumentWithVerticesAndWall();

    expect(findNearestWallIdByFootprint(document, ['w1'], [3.1, 0.96])).toBe('w1');
    expect(findNearestWallIdByFootprint(document, ['w1'], [3.1, 1.3])).toBeNull();
  });
});
