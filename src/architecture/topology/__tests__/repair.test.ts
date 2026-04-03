import { describe, expect, it } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../domain/document';
import { applyDrawWall, repairTopology } from '../repair';

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

function listNormalizedWallSegments(document: ArchitectureDocument): string[] {
  return document.wallOrder.map((wallId) => {
    const wall = document.walls[wallId];

    if (!wall) {
      throw new Error(`Missing wall "${wallId}" in test helper.`);
    }

    const start = document.vertices[wall.startVertexId];
    const end = document.vertices[wall.endVertexId];

    if (!start || !end) {
      throw new Error(`Missing wall vertices for "${wallId}" in test helper.`);
    }

    const orderedEndpoints = [
      `${start.x},${start.y}`,
      `${end.x},${end.y}`,
    ].sort();

    return `${orderedEndpoints[0]}->${orderedEndpoints[1]}`;
  }).sort();
}

function listVertexCoordinates(document: ArchitectureDocument): string[] {
  return Object.values(document.vertices)
    .map((vertex) => `${vertex.x},${vertex.y}`)
    .sort();
}

function expectRepairToBeStable(document: ArchitectureDocument) {
  const first = repairTopology(document);
  const second = repairTopology(first);

  expect(listNormalizedWallSegments(second)).toEqual(listNormalizedWallSegments(first));
  expect(listVertexCoordinates(second)).toEqual(listVertexCoordinates(first));
  expect(second.wallOrder).toEqual(first.wallOrder);
}

describe('repairTopology', () => {
  it('splits an existing wall when a crossing wall is inserted', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [2, -2], [2, 2]);

    expect(next.wallOrder).toHaveLength(4);
    expect(Object.keys(next.vertices)).toHaveLength(5);
  });

  it('removes zero-length wall segments during cleanup', () => {
    const documentWithDegenerateWall = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 0, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = repairTopology(documentWithDegenerateWall);

    expect(next.wallOrder).toHaveLength(0);
  });

  it('creates a T-junction when a new wall starts on an existing wall', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [2, 0], [2, 2]);

    expect(next.wallOrder).toHaveLength(3);
    expect(Object.keys(next.vertices)).toHaveLength(4);
  });

  it('removes overlapping duplicate walls during cleanup', () => {
    const documentWithDuplicateWalls = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v1' },
      ],
    });

    const next = repairTopology(documentWithDuplicateWalls);

    expect(next.wallOrder).toHaveLength(1);
  });

  it('removes isolated vertices left behind after duplicate wall cleanup', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
        { id: 'v3', x: 8, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v1' },
      ],
    });

    const next = repairTopology(document);

    expect(listVertexCoordinates(next)).toEqual(['0,0', '4,0']);
  });

  it('collapses a redundant collinear degree-2 split point', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 2, y: 0 },
        { id: 'v3', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
      ],
    });

    const next = repairTopology(document);

    expect(listNormalizedWallSegments(next)).toEqual(['0,0->4,0']);
    expect(listVertexCoordinates(next)).toEqual(['0,0', '4,0']);
  });

  it('preserves a tee junction center during cleanup', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 2, y: 0 },
        { id: 'v3', x: 4, y: 0 },
        { id: 'v4', x: 2, y: 2 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
        { id: 'w3', startVertexId: 'v2', endVertexId: 'v4' },
      ],
    });

    const next = repairTopology(document);

    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->2,0',
      '2,0->2,2',
      '2,0->4,0',
    ]);
  });

  it('does not collapse collinear walls when attributes differ', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 2, y: 0 },
        { id: 'v3', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
      ],
    });

    document.walls.w2!.thickness = 0.35;

    const next = repairTopology(document);

    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->2,0',
      '2,0->4,0',
    ]);
  });

  it('does not keep changing a graph after the first repair pass', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 2, y: 0 },
        { id: 'v3', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
        { id: 'w2', startVertexId: 'v2', endVertexId: 'v3' },
      ],
    });

    expectRepairToBeStable(document);
  });

  it('reuses an existing endpoint when a new wall meets an endpoint exactly', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [4, 0], [4, 2]);

    expect(next.wallOrder).toHaveLength(2);
    expect(Object.keys(next.vertices)).toHaveLength(3);
  });

  it('normalizes a partially overlapping collinear draw into shared legal segments', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [2, 0], [6, 0]);

    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->2,0',
      '2,0->4,0',
      '4,0->6,0',
    ]);
    expect(Object.keys(next.vertices)).toHaveLength(4);
  });

  it('snaps a near-end collinear extension onto the existing endpoint before normalizing', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [4.02, 0], [6, 0]);

    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->4,0',
      '4,0->6,0',
    ]);
    expect(Object.values(next.vertices).some((vertex) => vertex.x === 4.02)).toBe(false);
  });

  it('folds a fully overlapping collinear draw into the existing legal segment', () => {
    const document = createDocumentWithWalls({
      vertices: [
        { id: 'v1', x: 0, y: 0 },
        { id: 'v2', x: 4, y: 0 },
      ],
      walls: [
        { id: 'w1', startVertexId: 'v1', endVertexId: 'v2' },
      ],
    });

    const next = applyDrawWall(document, [0, 0], [4, 0]);

    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->4,0',
    ]);
    expect(Object.keys(next.vertices)).toHaveLength(2);
  });

  it('snaps a near-closing endpoint onto the existing rectangle corner by default', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);

    const next = applyDrawWall(document, [0, 3], [0.08, 0.04]);

    expect(Object.values(next.vertices).some((vertex) => vertex.x === 0.08 || vertex.y === 0.04)).toBe(false);
    expect(listNormalizedWallSegments(next)).toEqual([
      '0,0->0,3',
      '0,0->4,0',
      '0,3->4,3',
      '4,0->4,3',
    ]);
  });
});
