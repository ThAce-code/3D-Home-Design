import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../domain/document';
import { applyDrawWall, repairTopology } from '../repair';
import { rebuildZones } from '../zones';

function createDocumentWithWalls(args: {
  vertices: Array<{ id: string; x: number; y: number }>;
  walls: Array<{ id: string; startVertexId: string; endVertexId: string }>;
}): ArchitectureDocument {
  const document = createEmptyArchitectureDocument();
  const levelId = document.levelOrder[0];
  const level = document.levels[levelId];

  document.vertices = Object.fromEntries(
    args.vertices.map((vertex) => [vertex.id, vertex])
  );
  document.walls = Object.fromEntries(
    args.walls.map((wall) => [
      wall.id,
      {
        ...wall,
        levelId,
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural' as const,
      },
    ])
  );
  document.wallOrder = args.walls.map((wall) => wall.id);
  document.levels[levelId] = {
    ...level,
    vertexIds: args.vertices.map((vertex) => vertex.id),
    wallIds: args.walls.map((wall) => wall.id),
    zoneIds: [],
  };

  return document;
}

describe('rebuildZones', () => {
  it('creates one zone from a rectangular closed loop', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });

    const result = rebuildZones(rectangleDocument);

    expect(result.zoneOrder).toHaveLength(1);
    expect(result.zones[result.zoneOrder[0]].boundaryVertexIds).toHaveLength(4);
  });

  it('removes the zone when the loop is broken', () => {
    const openLoopDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
      ],
    });

    const result = rebuildZones(openLoopDocument);

    expect(result.zoneOrder).toEqual([]);
  });

  it('creates independent zones for nested closed loops', () => {
    const nestedLoopDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 8, y: 0 },
        { id: 'v3', x: 8, y: 8 },
        { id: 'v4', x: 0, y: 8 },
        { id: 'v5', x: 2, y: 2 },
        { id: 'v6', x: 6, y: 2 },
        { id: 'v7', x: 6, y: 6 },
        { id: 'v8', x: 2, y: 6 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
        { id: 'w5', startVertexId: 'v5', endVertexId: 'v6' },
        { id: 'w6', startVertexId: 'v6', endVertexId: 'v7' },
        { id: 'w7', startVertexId: 'v7', endVertexId: 'v8' },
        { id: 'w8', startVertexId: 'v8', endVertexId: 'v5' },
      ],
    });

    const result = rebuildZones(nestedLoopDocument);

    expect(result.zoneOrder).toHaveLength(2);
  });

  it('creates zones for shared-wall graphs that partition space into multiple rooms', () => {
    const sharedWallDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 2, y: 0 },
        { id: 'v3', x: 2, y: 2 },
        { id: 'v4', x: 0, y: 2 },
        { id: 'v5', x: 4, y: 0 },
        { id: 'v6', x: 4, y: 2 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
        { id: 'w5', startVertexId: 'v2', endVertexId: 'v5' },
        { id: 'w6', startVertexId: 'v5', endVertexId: 'v6' },
        { id: 'w7', startVertexId: 'v6', endVertexId: 'v3' },
      ],
    });

    const result = rebuildZones(sharedWallDocument);

    expect(result.zoneOrder).toHaveLength(2);
  });

  it('removes an existing zone after one wall is deleted from a valid rectangle', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const repairedRectangle = repairTopology(rectangleDocument);

    expect(repairedRectangle.zoneOrder).toHaveLength(1);

    const brokenRectangle: ArchitectureDocument = {
      ...repairedRectangle,
      walls: Object.fromEntries(
        Object.entries(repairedRectangle.walls).filter(([wallId]) => wallId !== 'w4')
      ),
      wallOrder: repairedRectangle.wallOrder.filter((wallId) => wallId !== 'w4'),
    };

    const result = repairTopology(brokenRectangle);

    expect(result.zoneOrder).toEqual([]);
  });

  it('reuses the same zone id when the same document is rebuilt twice', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });

    const first = rebuildZones(rectangleDocument);
    const second = rebuildZones(first);

    expect(second.zoneOrder).toEqual(first.zoneOrder);
  });

  it('reuses the same zone id when the stored boundary uses a different start vertex', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const zoneId = first.zoneOrder[0];
    const boundaryVertexIds = first.zones[zoneId].boundaryVertexIds;
    const rotatedBoundaryVertexIds = [
      ...boundaryVertexIds.slice(1),
      boundaryVertexIds[0],
    ];
    const rotatedInput: ArchitectureDocument = {
      ...first,
      zones: {
        ...first.zones,
        [zoneId]: {
          ...first.zones[zoneId],
          boundaryVertexIds: rotatedBoundaryVertexIds,
        },
      },
    };

    const result = rebuildZones(rotatedInput);

    expect(result.zoneOrder[0]).toBe(zoneId);
  });

  it('reuses the same zone id when the stored boundary uses the opposite winding', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const zoneId = first.zoneOrder[0];
    const reversedInput: ArchitectureDocument = {
      ...first,
      zones: {
        ...first.zones,
        [zoneId]: {
          ...first.zones[zoneId],
          boundaryVertexIds: [...first.zones[zoneId].boundaryVertexIds].reverse(),
        },
      },
    };

    const result = rebuildZones(reversedInput);

    expect(result.zoneOrder[0]).toBe(zoneId);
  });

  it('reuses the same zone id when a boundary edge is split by a collinear vertex', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const zoneId = first.zoneOrder[0];
    const levelId = first.levelOrder[0];
    const splitInput: ArchitectureDocument = {
      ...first,
      vertices: {
        ...first.vertices,
        v5: { id: 'v5', x: 2, y: 0 },
      },
      walls: {
        w1a: {
          ...first.walls.w1,
          id: 'w1a',
          startVertexId: 'v1',
          endVertexId: 'v5',
        },
        w1b: {
          ...first.walls.w1,
          id: 'w1b',
          startVertexId: 'v5',
          endVertexId: 'v2',
        },
        w2: first.walls.w2,
        w3: first.walls.w3,
        w4: first.walls.w4,
      },
      wallOrder: ['w1a', 'w1b', 'w2', 'w3', 'w4'],
      zones: {
        ...first.zones,
        [zoneId]: {
          ...first.zones[zoneId],
          kind: 'room',
          name: 'Living Room',
        },
      },
      levels: {
        ...first.levels,
        [levelId]: {
          ...first.levels[levelId],
          vertexIds: ['v1', 'v5', 'v2', 'v3', 'v4'],
          wallIds: ['w1a', 'w1b', 'w2', 'w3', 'w4'],
          zoneIds: [zoneId],
        },
      },
    };

    const result = rebuildZones(splitInput);

    expect(result.zoneOrder[0]).toBe(zoneId);
    expect(result.zones[zoneId]).toMatchObject({
      kind: 'room',
      name: 'Living Room',
    });
  });

  it('reuses the same zone id when most of the room overlaps but rebuilt walls introduce new boundary vertices', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const zoneId = first.zoneOrder[0];
    const levelId = first.levelOrder[0];
    const shiftedInput: ArchitectureDocument = {
      ...first,
      vertices: {
        ...first.vertices,
        v2b: { id: 'v2b', x: 4.5, y: 0 },
        v3b: { id: 'v3b', x: 4.5, y: 3 },
      },
      walls: {
        w1b: {
          ...first.walls.w1,
          id: 'w1b',
          startVertexId: 'v1',
          endVertexId: 'v2b',
        },
        w2b: {
          ...first.walls.w2,
          id: 'w2b',
          startVertexId: 'v2b',
          endVertexId: 'v3b',
        },
        w3b: {
          ...first.walls.w3,
          id: 'w3b',
          startVertexId: 'v3b',
          endVertexId: 'v4',
        },
        w4: {
          ...first.walls.w4,
          startVertexId: 'v4',
          endVertexId: 'v1',
        },
      },
      wallOrder: ['w1b', 'w2b', 'w3b', 'w4'],
      zones: {
        ...first.zones,
        [zoneId]: {
          ...first.zones[zoneId],
          kind: 'room',
          name: 'Primary Room',
        },
      },
      levels: {
        ...first.levels,
        [levelId]: {
          ...first.levels[levelId],
          vertexIds: ['v1', 'v2b', 'v3b', 'v4'],
          wallIds: ['w1b', 'w2b', 'w3b', 'w4'],
          zoneIds: [zoneId],
        },
      },
    };

    const result = rebuildZones(shiftedInput);

    expect(result.zoneOrder[0]).toBe(zoneId);
    expect(result.zones[zoneId]).toMatchObject({
      kind: 'room',
      name: 'Primary Room',
    });
  });

  it('reuses the same zone id when a local redraw turns an 8-side room into a 10-side room', () => {
    const octagonDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 1, y: 0 },
        { id: 'v2', x: 3, y: 0 },
        { id: 'v3', x: 4, y: 0.6 },
        { id: 'v4', x: 4, y: 1.8 },
        { id: 'v5', x: 4, y: 3 },
        { id: 'v6', x: 3, y: 4 },
        { id: 'v7', x: 1, y: 4 },
        { id: 'v8', x: 0, y: 3 },
        { id: 'v9', x: 0, y: 1.8 },
        { id: 'v10', x: 0, y: 0.6 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v5' },
        { id: 'w5', startVertexId: 'v5', endVertexId: 'v6' },
        { id: 'w6', startVertexId: 'v6', endVertexId: 'v7' },
        { id: 'w7', startVertexId: 'v7', endVertexId: 'v8' },
        { id: 'w8', startVertexId: 'v8', endVertexId: 'v9' },
        { id: 'w9', startVertexId: 'v9', endVertexId: 'v10' },
        { id: 'w10', startVertexId: 'v10', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(octagonDocument);
    const zoneId = first.zoneOrder[0];
    const levelId = first.levelOrder[0];
    const tenSidedVariant: ArchitectureDocument = {
      ...first,
      vertices: {
        ...first.vertices,
        v11: { id: 'v11', x: 3.6, y: 0.1 },
        v12: { id: 'v12', x: 4, y: 0.7 },
      },
      walls: {
        w1a: {
          ...first.walls.w1,
          id: 'w1a',
          startVertexId: 'v1',
          endVertexId: 'v2',
        },
        w1b: {
          ...first.walls.w1,
          id: 'w1b',
          startVertexId: 'v2',
          endVertexId: 'v11',
        },
        w1c: {
          ...first.walls.w1,
          id: 'w1c',
          startVertexId: 'v11',
          endVertexId: 'v12',
        },
        w1d: {
          ...first.walls.w1,
          id: 'w1d',
          startVertexId: 'v12',
          endVertexId: 'v3',
        },
        w2: first.walls.w2,
        w3: first.walls.w3,
        w4: first.walls.w4,
        w5: first.walls.w5,
        w6: first.walls.w6,
        w7: first.walls.w7,
        w8: first.walls.w8,
        w9: first.walls.w9,
        w10: first.walls.w10,
      },
      wallOrder: ['w1a', 'w1b', 'w1c', 'w1d', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'],
      zones: {
        ...first.zones,
        [zoneId]: {
          ...first.zones[zoneId],
          kind: 'room',
          name: 'Studio',
        },
      },
      levels: {
        ...first.levels,
        [levelId]: {
          ...first.levels[levelId],
          vertexIds: ['v1', 'v2', 'v11', 'v12', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'],
          wallIds: ['w1a', 'w1b', 'w1c', 'w1d', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'],
          zoneIds: [zoneId],
        },
      },
    };

    const result = rebuildZones(tenSidedVariant);

    expect(result.zoneOrder[0]).toBe(zoneId);
    expect(result.zones[zoneId]).toMatchObject({
      kind: 'room',
      name: 'Studio',
    });
  });

  it('drops the zone when the walls no longer form a closed loop even if the input still contains the old zone', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const brokenInput: ArchitectureDocument = {
      ...first,
      walls: Object.fromEntries(
        Object.entries(first.walls).filter(([wallId]) => wallId !== 'w4')
      ),
      wallOrder: first.wallOrder.filter((wallId) => wallId !== 'w4'),
    };

    const result = rebuildZones(brokenInput);

    expect(result.zoneOrder).toEqual([]);
  });

  it('reuses the old zone id when a closed loop is restored and the old zone still exists in the input document', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const zoneId = first.zoneOrder[0];
    const brokenInput: ArchitectureDocument = {
      ...first,
      walls: Object.fromEntries(
        Object.entries(first.walls).filter(([wallId]) => wallId !== 'w4')
      ),
      wallOrder: first.wallOrder.filter((wallId) => wallId !== 'w4'),
    };
    const restoredInput: ArchitectureDocument = {
      ...brokenInput,
      walls: first.walls,
      wallOrder: first.wallOrder,
    };

    const result = rebuildZones(restoredInput);

    expect(result.zoneOrder[0]).toBe(zoneId);
  });

  it('creates a new zone id when a closed loop is restored but the old zone is no longer present in the input document', () => {
    const rectangleDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 4, y: 3 },
        { id: 'v4', x: 0, y: 3 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });
    const first = rebuildZones(rectangleDocument);
    const previousZoneId = first.zoneOrder[0];
    const restoredWithoutOldZone: ArchitectureDocument = {
      ...first,
      zones: {},
      zoneOrder: [],
    };

    const result = rebuildZones(restoredWithoutOldZone);

    expect(result.zoneOrder).toHaveLength(1);
    expect(result.zoneOrder[0]).not.toBe(previousZoneId);
  });

  it('creates a zone when the final wall closes the loop near an existing corner', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);

    const result = applyDrawWall(document, [0, 3], [0.08, 0.04]);

    expect(result.zoneOrder).toHaveLength(1);
  });

  it('preserves the outer zone when a dangling T-wall is added to an otherwise closed rectangle', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);

    expect(document.zoneOrder).toHaveLength(1);

    const result = applyDrawWall(document, [2, 3], [2, 1]);

    expect(result.zoneOrder).toHaveLength(1);
    expect(result.zones[result.zoneOrder[0]].boundaryVertexIds).toHaveLength(5);
  });

  it('creates two zones when an inner rectangle is drawn inside an outer rectangle sequentially', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [8, 0]);
    document = applyDrawWall(document, [8, 0], [8, 8]);
    document = applyDrawWall(document, [8, 8], [0, 8]);
    document = applyDrawWall(document, [0, 8], [0, 0]);

    expect(document.zoneOrder).toHaveLength(1);

    document = applyDrawWall(document, [2, 2], [6, 2]);
    document = applyDrawWall(document, [6, 2], [6, 6]);
    document = applyDrawWall(document, [6, 6], [2, 6]);
    document = applyDrawWall(document, [2, 6], [2, 2]);

    expect(document.zoneOrder).toHaveLength(2);
  });

  it('creates zones for connected inner walls that subdivide an outer rectangle into multiple rooms', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [8, 0]);
    document = applyDrawWall(document, [8, 0], [8, 8]);
    document = applyDrawWall(document, [8, 8], [0, 8]);
    document = applyDrawWall(document, [0, 8], [0, 0]);
    document = applyDrawWall(document, [4, 8], [4, 5]);
    document = applyDrawWall(document, [4, 5], [6, 5]);
    document = applyDrawWall(document, [6, 5], [6, 3]);
    document = applyDrawWall(document, [6, 3], [8, 3]);

    const result = rebuildZones(document);

    expect(result.zoneOrder).toHaveLength(2);
  });

  it('keeps both zones when an inner rectangle is connected to the outer boundary by a single wall', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [10, 0]);
    document = applyDrawWall(document, [10, 0], [10, 10]);
    document = applyDrawWall(document, [10, 10], [0, 10]);
    document = applyDrawWall(document, [0, 10], [0, 0]);
    document = applyDrawWall(document, [3, 3], [7, 3]);
    document = applyDrawWall(document, [7, 3], [7, 7]);
    document = applyDrawWall(document, [7, 7], [3, 7]);
    document = applyDrawWall(document, [3, 7], [3, 3]);
    document = applyDrawWall(document, [5, 10], [5, 7]);

    const result = rebuildZones(document);

    expect(result.zoneOrder).toHaveLength(2);
  });

  it('creates zones for a screenshot-like inner enclosure graph with a stem and shelf walls', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [10, 0]);
    document = applyDrawWall(document, [10, 0], [10, 10]);
    document = applyDrawWall(document, [10, 10], [0, 10]);
    document = applyDrawWall(document, [0, 10], [0, 0]);
    document = applyDrawWall(document, [2, 3], [2, 10]);
    document = applyDrawWall(document, [2, 3], [5, 3]);
    document = applyDrawWall(document, [5, 0], [5, 6]);
    document = applyDrawWall(document, [5, 6], [10, 6]);

    const result = rebuildZones(document);

    expect(result.zoneOrder).toHaveLength(3);
  });

  it('filters out closed loops smaller than the minimum valid zone area', () => {
    const tinyLoopDocument = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 0.4, y: 0 },
        { id: 'v3', x: 0.4, y: 0.4 },
        { id: 'v4', x: 0, y: 0.4 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v3', endVertexId: 'v4' },
        { id: 'w4', startVertexId: 'v4', endVertexId: 'v1' },
      ],
    });

    const result = rebuildZones(tinyLoopDocument);

    expect(result.zoneOrder).toEqual([]);
  });
});
