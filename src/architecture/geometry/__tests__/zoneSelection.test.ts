import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../domain/document';
import { rebuildZones } from '../../topology/zones';
import { findZoneIdContainingPoint } from '../zoneSelection';

function createRectangleDocument(): ArchitectureDocument {
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

  return rebuildZones(document);
}

describe('findZoneIdContainingPoint', () => {
  it('returns the zone id for a point inside a simple loop', () => {
    const document = createRectangleDocument();
    const zoneId = document.zoneOrder[0];

    expect(findZoneIdContainingPoint(document, [2, 1.5])).toBe(zoneId);
  });

  it('returns null for a point outside every zone', () => {
    const document = createRectangleDocument();

    expect(findZoneIdContainingPoint(document, [5, 1.5])).toBeNull();
  });

  it('treats a point on the boundary as contained for V1 selection', () => {
    const document = createRectangleDocument();
    const zoneId = document.zoneOrder[0];

    expect(findZoneIdContainingPoint(document, [2, 0])).toBe(zoneId);
  });
});
