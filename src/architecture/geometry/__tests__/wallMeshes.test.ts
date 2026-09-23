import { describe, expect, it } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { buildWallMeshDescriptors } from '../wallMeshes';
import type { Point2 } from '../../topology/math';

function localToWorld(origin: Point2, angle: number, point: Point2): Point2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    origin[0] + (point[0] * cos) - (point[1] * sin),
    origin[1] + (point[0] * sin) + (point[1] * cos),
  ];
}

function toSortedWorldFootprints(wallId: string, document: ReturnType<typeof createEmptyArchitectureDocument>) {
  const descriptor = buildWallMeshDescriptors(document).find((candidate) => candidate.wallId === wallId);

  expect(descriptor).toBeDefined();

  return descriptor!.footprintPoints
    .map((point) => localToWorld(descriptor!.origin, descriptor!.angle, point))
    .map(([x, y]) => [
      Math.abs(x) <= 1e-6 ? 0 : Number(x.toFixed(6)),
      Math.abs(y) <= 1e-6 ? 0 : Number(y.toFixed(6)),
    ] as Point2)
    .sort(([ax, ay], [bx, by]) => (ax - bx) || (ay - by));
}

function normalizeLocalFootprint(points: Point2[] | undefined): Point2[] | undefined {
  return points?.map(([x, y]) => [
    Math.abs(x) <= 1e-6 ? 0 : Number(x.toFixed(6)),
    Math.abs(y) <= 1e-6 ? 0 : Number(y.toFixed(6)),
  ] as Point2);
}

describe('buildWallMeshDescriptors', () => {
  it('builds a cut-corner quadrilateral footprint at connected wall corners instead of adding centerline notches', () => {
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

    const [wall] = buildWallMeshDescriptors(document).filter((candidate) => candidate.wallId === 'w1');

    expect(wall).toBeDefined();
    expect(wall?.footprintPoints).toEqual([
      [0, -0.1],
      [4.1, -0.1],
      [3.9, 0.1],
      [0, 0.1],
    ]);
  });

  it('keeps the same world footprint across wall direction combinations at the same corner', () => {
    const createCornerDocument = (reverseEastWall: boolean, reverseAngledWall: boolean) => {
      const document = createEmptyArchitectureDocument();
      const levelId = document.levelOrder[0];
      const level = document.levels[levelId];

      document.vertices = {
        joint: { id: 'joint', x: 0, y: 0 },
        east: { id: 'east', x: 4, y: 0 },
        southwest: { id: 'southwest', x: -2, y: -4 },
      };
      document.walls = {
        eastWall: {
          id: 'eastWall',
          levelId,
          startVertexId: reverseEastWall ? 'east' : 'joint',
          endVertexId: reverseEastWall ? 'joint' : 'east',
          thickness: level.defaultWallThickness,
          height: level.defaultWallHeight,
          kind: 'structural',
        },
        angledWall: {
          id: 'angledWall',
          levelId,
          startVertexId: reverseAngledWall ? 'southwest' : 'joint',
          endVertexId: reverseAngledWall ? 'joint' : 'southwest',
          thickness: level.defaultWallThickness,
          height: level.defaultWallHeight,
          kind: 'structural',
        },
      };
      document.wallOrder = ['eastWall', 'angledWall'];

      return document;
    };

    const baseDocument = createCornerDocument(false, false);
    const reverseEastDocument = createCornerDocument(true, false);
    const reverseAngledDocument = createCornerDocument(false, true);
    const reverseBothDocument = createCornerDocument(true, true);

    expect(toSortedWorldFootprints('eastWall', reverseEastDocument)).toEqual(
      toSortedWorldFootprints('eastWall', baseDocument),
    );
    expect(toSortedWorldFootprints('eastWall', reverseAngledDocument)).toEqual(
      toSortedWorldFootprints('eastWall', baseDocument),
    );
    expect(toSortedWorldFootprints('eastWall', reverseBothDocument)).toEqual(
      toSortedWorldFootprints('eastWall', baseDocument),
    );
    expect(toSortedWorldFootprints('angledWall', reverseEastDocument)).toEqual(
      toSortedWorldFootprints('angledWall', baseDocument),
    );
    expect(toSortedWorldFootprints('angledWall', reverseAngledDocument)).toEqual(
      toSortedWorldFootprints('angledWall', baseDocument),
    );
    expect(toSortedWorldFootprints('angledWall', reverseBothDocument)).toEqual(
      toSortedWorldFootprints('angledWall', baseDocument),
    );
  });

  it('keeps a T-junction branch centered on the host wall axis instead of shifting its join cap outward', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      bottom: { id: 'bottom', x: 0, y: -4 },
      center: { id: 'center', x: 0, y: 0 },
      top: { id: 'top', x: 0, y: 4 },
      right: { id: 'right', x: 4, y: 0 },
    };
    document.walls = {
      lower: {
        id: 'lower',
        levelId,
        startVertexId: 'bottom',
        endVertexId: 'center',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      upper: {
        id: 'upper',
        levelId,
        startVertexId: 'center',
        endVertexId: 'top',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      branch: {
        id: 'branch',
        levelId,
        startVertexId: 'center',
        endVertexId: 'right',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['lower', 'upper', 'branch'];

    const branch = buildWallMeshDescriptors(document).find((candidate) => candidate.wallId === 'branch');

    expect(branch?.footprintPoints).toEqual([
      [0, -0.1],
      [4, -0.1],
      [4, 0.1],
      [0, 0.1],
    ]);
  });

  it('keeps both host wall segments flat at a T-junction instead of leaving an outer spike at the split vertex', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      left: { id: 'left', x: -4, y: 0 },
      center: { id: 'center', x: 0, y: 0 },
      right: { id: 'right', x: 4, y: 0 },
      down: { id: 'down', x: 0, y: -4 },
    };
    document.walls = {
      leftSeg: {
        id: 'leftSeg',
        levelId,
        startVertexId: 'left',
        endVertexId: 'center',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      rightSeg: {
        id: 'rightSeg',
        levelId,
        startVertexId: 'center',
        endVertexId: 'right',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      branch: {
        id: 'branch',
        levelId,
        startVertexId: 'center',
        endVertexId: 'down',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['leftSeg', 'rightSeg', 'branch'];

    const descriptors = buildWallMeshDescriptors(document);
    const leftSeg = descriptors.find((candidate) => candidate.wallId === 'leftSeg');
    const rightSeg = descriptors.find((candidate) => candidate.wallId === 'rightSeg');

    expect(leftSeg?.footprintPoints).toEqual([
      [0, -0.1],
      [4, -0.1],
      [4, 0.1],
      [0, 0.1],
    ]);
    expect(rightSeg?.footprintPoints).toEqual([
      [0, -0.1],
      [4, -0.1],
      [4, 0.1],
      [0, 0.1],
    ]);
  });

  it('keeps all four wall segments flat at a cross junction so the through-wall does not open a gap', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      left: { id: 'left', x: -4, y: 0 },
      center: { id: 'center', x: 0, y: 0 },
      right: { id: 'right', x: 4, y: 0 },
      down: { id: 'down', x: 0, y: -4 },
      up: { id: 'up', x: 0, y: 4 },
    };
    document.walls = {
      leftSeg: {
        id: 'leftSeg',
        levelId,
        startVertexId: 'left',
        endVertexId: 'center',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      rightSeg: {
        id: 'rightSeg',
        levelId,
        startVertexId: 'center',
        endVertexId: 'right',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      downSeg: {
        id: 'downSeg',
        levelId,
        startVertexId: 'down',
        endVertexId: 'center',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
      upSeg: {
        id: 'upSeg',
        levelId,
        startVertexId: 'center',
        endVertexId: 'up',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['leftSeg', 'rightSeg', 'downSeg', 'upSeg'];

    const descriptors = buildWallMeshDescriptors(document);

    for (const wallId of ['leftSeg', 'rightSeg', 'downSeg', 'upSeg']) {
      const wall = descriptors.find((candidate) => candidate.wallId === wallId);

      expect(normalizeLocalFootprint(wall?.footprintPoints)).toEqual([
        [0, -0.1],
        [4, -0.1],
        [4, 0.1],
        [0, 0.1],
      ]);
    }
  });
});
