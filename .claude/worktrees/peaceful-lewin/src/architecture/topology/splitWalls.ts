import { cloneArchitectureDocument, syncLevelEntityIds, type ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from './math.js';
import { cross2D, distanceBetweenPoints, dot2D, subtractPoints } from './math.js';
import { intersectSegments } from './intersections.js';
import type { Wall } from '../domain/wall.js';

interface WallSplitPoint {
  point: Point2;
  t: number;
  vertexId: string;
}

function getVertexPoint(document: ArchitectureDocument, vertexId: string): Point2 {
  const vertex = document.vertices[vertexId];

  if (!vertex) {
    throw new Error(`Missing vertex "${vertexId}" while splitting walls.`);
  }

  return [vertex.x, vertex.y];
}

function findMatchingVertexId(
  document: ArchitectureDocument,
  point: Point2,
  tolerance: number,
  candidateIds: string[]
): string | null {
  for (const vertexId of candidateIds) {
    const vertex = document.vertices[vertexId];

    if (vertex && distanceBetweenPoints(point, [vertex.x, vertex.y]) <= tolerance) {
      return vertexId;
    }
  }

  for (const [vertexId, vertex] of Object.entries(document.vertices)) {
    if (distanceBetweenPoints(point, [vertex.x, vertex.y]) <= tolerance) {
      return vertexId;
    }
  }

  return null;
}

function resolveVertexIdForPoint(
  document: ArchitectureDocument,
  point: Point2,
  tolerance: number,
  candidateIds: string[]
): string {
  const matchedVertexId = findMatchingVertexId(document, point, tolerance, candidateIds);

  if (matchedVertexId) {
    return matchedVertexId;
  }

  const vertexId = crypto.randomUUID();
  document.vertices[vertexId] = {
    id: vertexId,
    x: point[0],
    y: point[1],
  };

  return vertexId;
}

function normalizeSplitPoints(points: WallSplitPoint[], epsilon: number): WallSplitPoint[] {
  const orderedPoints = [...points].sort((left, right) => left.t - right.t);
  const normalized: WallSplitPoint[] = [];

  for (const point of orderedPoints) {
    const lastPoint = normalized[normalized.length - 1];

    if (!lastPoint) {
      normalized.push(point);
      continue;
    }

    if (Math.abs(point.t - lastPoint.t) <= epsilon) {
      continue;
    }

    normalized.push(point);
  }

  return normalized;
}

function getSegmentParameter(point: Point2, start: Point2, end: Point2): number {
  const direction = subtractPoints(end, start);
  const lengthSquared = dot2D(direction, direction);

  if (lengthSquared === 0) {
    return 0;
  }

  return dot2D(subtractPoints(point, start), direction) / lengthSquared;
}

function isPointOnSegment(point: Point2, start: Point2, end: Point2, epsilon: number): boolean {
  const fromStart = subtractPoints(point, start);
  const direction = subtractPoints(end, start);

  if (Math.abs(cross2D(direction, fromStart)) > epsilon) {
    return false;
  }

  const t = getSegmentParameter(point, start, end);

  return t >= -epsilon && t <= 1 + epsilon;
}

function areCollinearSegments(startA: Point2, endA: Point2, startB: Point2, endB: Point2, epsilon: number): boolean {
  const directionA = subtractPoints(endA, startA);

  return (
    Math.abs(cross2D(directionA, subtractPoints(startB, startA))) <= epsilon &&
    Math.abs(cross2D(directionA, subtractPoints(endB, startA))) <= epsilon
  );
}

function pushSplitPoint(
  splitPointsByWallId: Map<string, WallSplitPoint[]>,
  targetWall: Wall,
  point: Point2,
  vertexId: string,
  start: Point2,
  end: Point2
): void {
  splitPointsByWallId.get(targetWall.id)?.push({
    vertexId,
    point,
    t: getSegmentParameter(point, start, end),
  });
}

function addCollinearOverlapSplitPoints(
  document: ArchitectureDocument,
  next: ArchitectureDocument,
  splitPointsByWallId: Map<string, WallSplitPoint[]>,
  wallA: Wall,
  wallB: Wall,
  epsilon: number
): void {
  const startA = getVertexPoint(document, wallA.startVertexId);
  const endA = getVertexPoint(document, wallA.endVertexId);
  const startB = getVertexPoint(document, wallB.startVertexId);
  const endB = getVertexPoint(document, wallB.endVertexId);

  if (!areCollinearSegments(startA, endA, startB, endB, epsilon)) {
    return;
  }

  const candidates = [
    {
      targetWall: wallB,
      point: startA,
      targetStart: startB,
      targetEnd: endB,
      candidateIds: [wallA.startVertexId, wallB.startVertexId, wallB.endVertexId],
    },
    {
      targetWall: wallB,
      point: endA,
      targetStart: startB,
      targetEnd: endB,
      candidateIds: [wallA.endVertexId, wallB.startVertexId, wallB.endVertexId],
    },
    {
      targetWall: wallA,
      point: startB,
      targetStart: startA,
      targetEnd: endA,
      candidateIds: [wallB.startVertexId, wallA.startVertexId, wallA.endVertexId],
    },
    {
      targetWall: wallA,
      point: endB,
      targetStart: startA,
      targetEnd: endA,
      candidateIds: [wallB.endVertexId, wallA.startVertexId, wallA.endVertexId],
    },
  ];

  for (const candidate of candidates) {
    if (!isPointOnSegment(candidate.point, candidate.targetStart, candidate.targetEnd, epsilon)) {
      continue;
    }

    const vertexId = resolveVertexIdForPoint(
      next,
      candidate.point,
      epsilon,
      candidate.candidateIds
    );

    pushSplitPoint(
      splitPointsByWallId,
      candidate.targetWall,
      candidate.point,
      vertexId,
      candidate.targetStart,
      candidate.targetEnd
    );
  }
}

export function splitIntersectingWalls(
  document: ArchitectureDocument,
  epsilon = 1e-6
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const sourceWallIds = [...document.wallOrder];
  const splitPointsByWallId = new Map<string, WallSplitPoint[]>();

  for (const wallId of sourceWallIds) {
    const wall = document.walls[wallId];

    if (!wall) {
      continue;
    }

    splitPointsByWallId.set(wallId, [
      {
        vertexId: wall.startVertexId,
        point: getVertexPoint(document, wall.startVertexId),
        t: 0,
      },
      {
        vertexId: wall.endVertexId,
        point: getVertexPoint(document, wall.endVertexId),
        t: 1,
      },
    ]);
  }

  for (let index = 0; index < sourceWallIds.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < sourceWallIds.length; nextIndex += 1) {
      const wallA = document.walls[sourceWallIds[index]];
      const wallB = document.walls[sourceWallIds[nextIndex]];

      if (!wallA || !wallB) {
        continue;
      }

      const hit = intersectSegments(
        getVertexPoint(document, wallA.startVertexId),
        getVertexPoint(document, wallA.endVertexId),
        getVertexPoint(document, wallB.startVertexId),
        getVertexPoint(document, wallB.endVertexId),
        epsilon
      );

      if (!hit) {
        addCollinearOverlapSplitPoints(
          document,
          next,
          splitPointsByWallId,
          wallA,
          wallB,
          epsilon
        );
        continue;
      }

      const vertexId = resolveVertexIdForPoint(next, hit.point, epsilon, [
        wallA.startVertexId,
        wallA.endVertexId,
        wallB.startVertexId,
        wallB.endVertexId,
      ]);

      splitPointsByWallId.get(wallA.id)?.push({
        vertexId,
        point: hit.point,
        t: hit.t,
      });
      splitPointsByWallId.get(wallB.id)?.push({
        vertexId,
        point: hit.point,
        t: hit.u,
      });
    }
  }

  next.walls = {};
  next.wallOrder = [];

  for (const wallId of sourceWallIds) {
    const wall = document.walls[wallId];
    const splitPoints = splitPointsByWallId.get(wallId);

    if (!wall || !splitPoints) {
      continue;
    }

    const normalizedPoints = normalizeSplitPoints(splitPoints, epsilon);
    const segments: Array<{ startVertexId: string; endVertexId: string }> = [];

    for (let index = 0; index < normalizedPoints.length - 1; index += 1) {
      const start = normalizedPoints[index];
      const end = normalizedPoints[index + 1];

      if (start.vertexId === end.vertexId) {
        continue;
      }

      segments.push({
        startVertexId: start.vertexId,
        endVertexId: end.vertexId,
      });
    }

    if (segments.length === 0) {
      continue;
    }

    const shouldPreserveWallId = segments.length === 1;

    segments.forEach((segment, segmentIndex) => {
      const segmentWallId = shouldPreserveWallId && segmentIndex === 0
        ? wall.id
        : crypto.randomUUID();

      next.walls[segmentWallId] = {
        ...wall,
        id: segmentWallId,
        startVertexId: segment.startVertexId,
        endVertexId: segment.endVertexId,
      };
      next.wallOrder.push(segmentWallId);
    });
  }

  return syncLevelEntityIds(next);
}
