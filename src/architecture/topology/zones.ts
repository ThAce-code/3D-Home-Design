import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { Zone, ZoneTombstone } from '../domain/zone.js';
import { cross2D, dot2D, subtractPoints, type Point2 } from './math.js';
import { findClosedLoops } from './loops.js';
import { matchZones, type NextLoopMatchInput, type PreviousZoneMatchInput } from './zoneMatcher.js';

export const MIN_VALID_ZONE_AREA = 0.25;
export const MAX_TOMBSTONES = 50;

interface BoundaryGeometry {
  area: number;
  centroid: Point2;
  points: Point2[];
}

interface LoopMatchState {
  area: number;
  canonicalBoundaryVertexIds: string[];
  centroid: Point2;
  levelId: string;
  points: Point2[];
  signature: string;
}

// V1 only accepts disconnected simple loops as zone candidates. Shared-wall
// graphs and full face extraction remain explicitly out of scope for now.
function rotateBoundaryToSmallestVertexId(boundaryVertexIds: string[]): string[] {
  if (boundaryVertexIds.length <= 1) {
    return [...boundaryVertexIds];
  }

  const smallestVertexId = [...boundaryVertexIds].sort()[0];
  const startIndex = boundaryVertexIds.indexOf(smallestVertexId);

  if (startIndex === -1) {
    return [...boundaryVertexIds];
  }

  return [
    ...boundaryVertexIds.slice(startIndex),
    ...boundaryVertexIds.slice(0, startIndex),
  ];
}

export function canonicalizeBoundaryVertexIds(boundaryVertexIds: string[]): string[] {
  const forward = rotateBoundaryToSmallestVertexId(boundaryVertexIds);
  const reverse = rotateBoundaryToSmallestVertexId([...boundaryVertexIds].reverse());
  const forwardSignature = forward.join('|');
  const reverseSignature = reverse.join('|');

  return forwardSignature <= reverseSignature ? forward : reverse;
}

function getVertexPoint(
  document: ArchitectureDocument,
  vertexId: string
): Point2 | null {
  const vertex = document.vertices[vertexId];

  if (!vertex) {
    return null;
  }

  return [vertex.x, vertex.y];
}

function isRedundantBoundaryVertex(
  document: ArchitectureDocument,
  previousVertexId: string,
  currentVertexId: string,
  nextVertexId: string,
  epsilon: number
): boolean {
  const previousPoint = getVertexPoint(document, previousVertexId);
  const currentPoint = getVertexPoint(document, currentVertexId);
  const nextPoint = getVertexPoint(document, nextVertexId);

  if (!previousPoint || !currentPoint || !nextPoint) {
    return false;
  }

  const previousToNext = subtractPoints(nextPoint, previousPoint);
  const previousToCurrent = subtractPoints(currentPoint, previousPoint);
  const currentToNext = subtractPoints(currentPoint, nextPoint);

  if (Math.abs(cross2D(previousToNext, previousToCurrent)) > epsilon) {
    return false;
  }

  return dot2D(previousToCurrent, currentToNext) <= epsilon;
}

function simplifyBoundaryVertexIds(
  document: ArchitectureDocument,
  boundaryVertexIds: string[],
  epsilon: number
): string[] {
  if (boundaryVertexIds.length <= 3) {
    return [...boundaryVertexIds];
  }

  const simplified = [...boundaryVertexIds];
  let changed = true;

  while (changed && simplified.length > 3) {
    changed = false;

    for (let index = 0; index < simplified.length; index += 1) {
      const previousVertexId = simplified[(index - 1 + simplified.length) % simplified.length];
      const currentVertexId = simplified[index];
      const nextVertexId = simplified[(index + 1) % simplified.length];

      if (!previousVertexId || !currentVertexId || !nextVertexId) {
        continue;
      }

      if (!isRedundantBoundaryVertex(
        document,
        previousVertexId,
        currentVertexId,
        nextVertexId,
        epsilon
      )) {
        continue;
      }

      simplified.splice(index, 1);
      changed = true;
      break;
    }
  }

  return simplified;
}

function createBoundarySignature(
  document: ArchitectureDocument,
  boundaryVertexIds: string[],
  epsilon: number
): string {
  return canonicalizeBoundaryVertexIds(
    simplifyBoundaryVertexIds(document, boundaryVertexIds, epsilon)
  ).join('|');
}

function computeSignedArea(points: Point2[]): number {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!current || !next) {
      return 0;
    }

    area += (current[0] * next[1]) - (next[0] * current[1]);
  }

  return area / 2;
}

function computePolygonArea(points: Point2[]): number {
  return Math.abs(computeSignedArea(points));
}

function computePolygonCentroid(points: Point2[], epsilon: number): Point2 {
  const signedArea = computeSignedArea(points);

  if (Math.abs(signedArea) <= epsilon) {
    const [sumX, sumY] = points.reduce<[number, number]>(
      (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
      [0, 0]
    );
    const divisor = points.length || 1;

    return [sumX / divisor, sumY / divisor];
  }

  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!current || !next) {
      continue;
    }

    const cross = (current[0] * next[1]) - (next[0] * current[1]);
    centroidX += (current[0] + next[0]) * cross;
    centroidY += (current[1] + next[1]) * cross;
  }

  const divisor = 6 * signedArea;

  return [centroidX / divisor, centroidY / divisor];
}

function buildBoundaryGeometry(
  document: ArchitectureDocument,
  boundaryVertexIds: string[],
  epsilon: number
): BoundaryGeometry | null {
  const simplifiedBoundaryVertexIds = simplifyBoundaryVertexIds(
    document,
    boundaryVertexIds,
    epsilon
  );
  const points = simplifiedBoundaryVertexIds.flatMap((vertexId) => {
    const point = getVertexPoint(document, vertexId);

    return point ? [point] : [];
  });

  if (points.length < 3 || points.length !== simplifiedBoundaryVertexIds.length) {
    return null;
  }

  const signedArea = computeSignedArea(points);
  if (Math.abs(signedArea) <= epsilon) {
    return null;
  }

  const normalizedPoints = signedArea > 0 ? points : [...points].reverse();

  return {
    area: computePolygonArea(normalizedPoints),
    centroid: computePolygonCentroid(normalizedPoints, epsilon),
    points: normalizedPoints,
  };
}

function isPointInsideTriangle(
  point: Point2,
  triangle: [Point2, Point2, Point2],
  epsilon: number
): boolean {
  const [a, b, c] = triangle;
  const ab = cross2D(subtractPoints(b, a), subtractPoints(point, a));
  const bc = cross2D(subtractPoints(c, b), subtractPoints(point, b));
  const ca = cross2D(subtractPoints(a, c), subtractPoints(point, c));

  return ab >= -epsilon && bc >= -epsilon && ca >= -epsilon;
}

function triangulatePolygon(points: Point2[], epsilon: number): Array<[Point2, Point2, Point2]> {
  if (points.length < 3) {
    return [];
  }

  const remainingIndices = points.map((_, index) => index);
  const triangles: Array<[Point2, Point2, Point2]> = [];

  while (remainingIndices.length > 3) {
    let clippedEar = false;

    for (let index = 0; index < remainingIndices.length; index += 1) {
      const previousIndex = remainingIndices[(index - 1 + remainingIndices.length) % remainingIndices.length];
      const currentIndex = remainingIndices[index];
      const nextIndex = remainingIndices[(index + 1) % remainingIndices.length];

      if (previousIndex === undefined || currentIndex === undefined || nextIndex === undefined) {
        continue;
      }

      const previousPoint = points[previousIndex];
      const currentPoint = points[currentIndex];
      const nextPoint = points[nextIndex];

      if (!previousPoint || !currentPoint || !nextPoint) {
        continue;
      }

      const cross = cross2D(
        subtractPoints(currentPoint, previousPoint),
        subtractPoints(nextPoint, currentPoint)
      );

      if (cross <= epsilon) {
        continue;
      }

      const triangle: [Point2, Point2, Point2] = [
        previousPoint,
        currentPoint,
        nextPoint,
      ];

      const containsOtherPoint = remainingIndices.some((candidateIndex) => {
        if (
          candidateIndex === previousIndex ||
          candidateIndex === currentIndex ||
          candidateIndex === nextIndex
        ) {
          return false;
        }

        const candidatePoint = points[candidateIndex];

        return candidatePoint
          ? isPointInsideTriangle(candidatePoint, triangle, epsilon)
          : false;
      });

      if (containsOtherPoint) {
        continue;
      }

      triangles.push(triangle);
      remainingIndices.splice(index, 1);
      clippedEar = true;
      break;
    }

    if (!clippedEar) {
      return [];
    }
  }

  if (remainingIndices.length === 3) {
    const trianglePoints = remainingIndices.map((index) => points[index]);

    if (trianglePoints[0] && trianglePoints[1] && trianglePoints[2]) {
      triangles.push([
        trianglePoints[0],
        trianglePoints[1],
        trianglePoints[2],
      ]);
    }
  }

  return triangles;
}

function isInsideClipEdge(
  point: Point2,
  edgeStart: Point2,
  edgeEnd: Point2,
  epsilon: number
): boolean {
  return cross2D(
    subtractPoints(edgeEnd, edgeStart),
    subtractPoints(point, edgeStart)
  ) >= -epsilon;
}

function intersectInfiniteLines(
  segmentStart: Point2,
  segmentEnd: Point2,
  clipStart: Point2,
  clipEnd: Point2,
  epsilon: number
): Point2 {
  const segmentDirection = subtractPoints(segmentEnd, segmentStart);
  const clipDirection = subtractPoints(clipEnd, clipStart);
  const denominator = cross2D(segmentDirection, clipDirection);

  if (Math.abs(denominator) <= epsilon) {
    return segmentEnd;
  }

  const t = cross2D(
    subtractPoints(clipStart, segmentStart),
    clipDirection
  ) / denominator;

  return [
    segmentStart[0] + (segmentDirection[0] * t),
    segmentStart[1] + (segmentDirection[1] * t),
  ];
}

function clipPolygonAgainstEdge(
  polygon: Point2[],
  edgeStart: Point2,
  edgeEnd: Point2,
  epsilon: number
): Point2[] {
  if (polygon.length === 0) {
    return [];
  }

  const clipped: Point2[] = [];
  let previousPoint = polygon[polygon.length - 1];

  for (const currentPoint of polygon) {
    if (!previousPoint) {
      previousPoint = currentPoint;
      continue;
    }

    const currentInside = isInsideClipEdge(currentPoint, edgeStart, edgeEnd, epsilon);
    const previousInside = isInsideClipEdge(previousPoint, edgeStart, edgeEnd, epsilon);

    if (currentInside) {
      if (!previousInside) {
        clipped.push(intersectInfiniteLines(
          previousPoint,
          currentPoint,
          edgeStart,
          edgeEnd,
          epsilon
        ));
      }

      clipped.push(currentPoint);
    } else if (previousInside) {
      clipped.push(intersectInfiniteLines(
        previousPoint,
        currentPoint,
        edgeStart,
        edgeEnd,
        epsilon
      ));
    }

    previousPoint = currentPoint;
  }

  return clipped;
}

function intersectTriangleWithTriangle(
  subjectTriangle: [Point2, Point2, Point2],
  clipTriangle: [Point2, Point2, Point2],
  epsilon: number
): number {
  let clipped: Point2[] = [...subjectTriangle];

  for (let index = 0; index < clipTriangle.length; index += 1) {
    const edgeStart = clipTriangle[index];
    const edgeEnd = clipTriangle[(index + 1) % clipTriangle.length];

    if (!edgeStart || !edgeEnd) {
      return 0;
    }

    clipped = clipPolygonAgainstEdge(clipped, edgeStart, edgeEnd, epsilon);

    if (clipped.length === 0) {
      return 0;
    }
  }

  return computePolygonArea(clipped);
}

export function rebuildZones(
  document: ArchitectureDocument,
  epsilon = 1e-6,
  previousDocument: ArchitectureDocument = document
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const loops = findClosedLoops(next, epsilon);
  const previousZoneById = new Map<string, Zone>();
  const previousZones: PreviousZoneMatchInput[] = [];

  for (const zoneId of previousDocument.zoneOrder) {
    const zone = previousDocument.zones[zoneId];

    if (!zone) {
      continue;
    }

    const signature = createBoundarySignature(previousDocument, zone.boundaryVertexIds, epsilon);
    previousZoneById.set(zoneId, zone);
    previousZones.push({
      geometry: buildBoundaryGeometry(previousDocument, zone.boundaryVertexIds, epsilon),
      levelId: zone.levelId,
      signature,
      zoneId,
    });
  }

  const tombstoneById = new Map<string, ZoneTombstone>();

  for (const tombstone of previousDocument.zoneTombstones ?? []) {
    if (previousZoneById.has(tombstone.id)) {
      continue;
    }

    tombstoneById.set(tombstone.id, tombstone);
    previousZones.push({
      geometry: tombstone.geometry,
      levelId: tombstone.levelId,
      signature: tombstone.signature,
      zoneId: tombstone.id,
    });
  }

  const loopStates = loops.flatMap<LoopMatchState>((loop) => {
    const canonicalBoundaryVertexIds = canonicalizeBoundaryVertexIds(loop.vertexIds);
    const geometry = buildBoundaryGeometry(next, canonicalBoundaryVertexIds, epsilon);

    if (!geometry || geometry.area < MIN_VALID_ZONE_AREA) {
      return [];
    }

    return [{
      area: geometry.area,
      canonicalBoundaryVertexIds,
      centroid: geometry.centroid,
      levelId: loop.levelId,
      points: geometry.points,
      signature: createBoundarySignature(next, canonicalBoundaryVertexIds, epsilon),
    }];
  }).sort((left, right) => {
    const levelComparison = left.levelId.localeCompare(right.levelId);

    return levelComparison !== 0
      ? levelComparison
      : left.signature.localeCompare(right.signature);
  });

  const reusableZoneIdByLoopIndex = matchZones({
    epsilon,
    nextLoops: loopStates.map<NextLoopMatchInput>((loop) => ({
      area: loop.area,
      centroid: loop.centroid,
      levelId: loop.levelId,
      points: loop.points,
      signature: loop.signature,
    })),
    previousZones,
  }).reusedZoneIdByLoopIndex;

  const matchedZoneIds = new Set(reusableZoneIdByLoopIndex.values());
  const newTombstones: ZoneTombstone[] = [];

  for (const zoneId of previousDocument.zoneOrder) {
    if (matchedZoneIds.has(zoneId)) {
      continue;
    }

    const zone = previousDocument.zones[zoneId];

    if (!zone) {
      continue;
    }

    const geometry = buildBoundaryGeometry(previousDocument, zone.boundaryVertexIds, epsilon);

    if (!geometry) {
      continue;
    }

    newTombstones.push({
      id: zone.id,
      levelId: zone.levelId,
      kind: zone.kind,
      name: zone.name,
      geometry: {
        area: geometry.area,
        centroid: geometry.centroid,
        points: geometry.points,
      },
      signature: createBoundarySignature(previousDocument, zone.boundaryVertexIds, epsilon),
    });
  }

  next.zones = {};
  next.zoneOrder = [];

  for (const [loopIndex, loop] of loopStates.entries()) {
    const reusableZoneId = reusableZoneIdByLoopIndex.get(loopIndex) ?? null;
    const zoneId = reusableZoneId ?? crypto.randomUUID();
    const previousZone = reusableZoneId
      ? previousZoneById.get(reusableZoneId)
      : null;
    const tombstone = reusableZoneId
      ? tombstoneById.get(reusableZoneId)
      : null;

    next.zones[zoneId] = {
      id: zoneId,
      levelId: loop.levelId,
      boundaryVertexIds: loop.canonicalBoundaryVertexIds,
      kind: previousZone?.kind ?? tombstone?.kind ?? 'unknown',
      name: previousZone?.name ?? tombstone?.name ?? null,
    };
    next.zoneOrder.push(zoneId);
  }

  const consumedTombstoneIds = new Set(
    [...matchedZoneIds].filter((zoneId) => tombstoneById.has(zoneId))
  );
  const survivingTombstones = (previousDocument.zoneTombstones ?? []).filter(
    (tombstone) => !consumedTombstoneIds.has(tombstone.id)
  );
  const allTombstones = [...survivingTombstones, ...newTombstones];
  next.zoneTombstones = allTombstones.length > MAX_TOMBSTONES
    ? allTombstones.slice(-MAX_TOMBSTONES)
    : allTombstones;

  return syncLevelEntityIds(next);
}
