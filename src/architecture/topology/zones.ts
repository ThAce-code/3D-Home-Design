import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { Zone } from '../domain/zone.js';
import { cross2D, dot2D, subtractPoints, type Point2 } from './math.js';
import { findClosedLoops } from './loops.js';

export const MIN_VALID_ZONE_AREA = 0.25;
const MIN_ZONE_ID_OVERLAP_RATIO = 0.6;

interface BoundaryGeometry {
  area: number;
  centroid: Point2;
  points: Point2[];
}

interface PreviousZoneMatchState {
  geometry: BoundaryGeometry | null;
  signature: string;
  zone: Zone;
}

interface LoopMatchState {
  area: number;
  canonicalBoundaryVertexIds: string[];
  centroid: Point2;
  levelId: string;
  points: Point2[];
  signature: string;
}

interface OverlapMatchCandidate {
  centroidDistance: number;
  loopIndex: number;
  overlapArea: number;
  overlapNewRatio: number;
  overlapOldRatio: number;
  zoneId: string;
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

function createLevelScopedSignature(levelId: string, signature: string): string {
  return `${levelId}::${signature}`;
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

function computePolygonOverlapArea(
  leftPoints: Point2[],
  rightPoints: Point2[],
  epsilon: number
): number {
  const leftTriangles = triangulatePolygon(leftPoints, epsilon);
  const rightTriangles = triangulatePolygon(rightPoints, epsilon);

  if (leftTriangles.length === 0 || rightTriangles.length === 0) {
    return 0;
  }

  let overlapArea = 0;

  for (const leftTriangle of leftTriangles) {
    for (const rightTriangle of rightTriangles) {
      overlapArea += intersectTriangleWithTriangle(
        leftTriangle,
        rightTriangle,
        epsilon
      );
    }
  }

  return overlapArea;
}

function distanceBetweenPoints(left: Point2, right: Point2): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function isPointOnSegment(
  point: Point2,
  start: Point2,
  end: Point2,
  epsilon: number
): boolean {
  const startToEnd = subtractPoints(end, start);
  const startToPoint = subtractPoints(point, start);
  const endToPoint = subtractPoints(point, end);
  const cross = Math.abs(cross2D(startToEnd, startToPoint));

  if (cross > epsilon) {
    return false;
  }

  return dot2D(startToPoint, endToPoint) <= epsilon;
}

function containsPoint(points: Point2[], point: Point2, epsilon: number): boolean {
  let inside = false;

  for (let currentIndex = 0; currentIndex < points.length; currentIndex += 1) {
    const nextIndex = (currentIndex + 1) % points.length;
    const current = points[currentIndex];
    const next = points[nextIndex];

    if (!current || !next) {
      continue;
    }

    if (isPointOnSegment(point, current, next, epsilon)) {
      return true;
    }

    const intersects = ((current[1] > point[1]) !== (next[1] > point[1]))
      && (point[0] < (((next[0] - current[0]) * (point[1] - current[1])) / (next[1] - current[1])) + current[0]);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function buildCoverageSamples(points: Point2[], centroid: Point2): Point2[] {
  const samples: Point2[] = [centroid];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!current || !next) {
      continue;
    }

    samples.push(current);
    samples.push([
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    ]);
  }

  return samples;
}

function computeCoverageRatio(
  subjectPoints: Point2[],
  subjectCentroid: Point2,
  containerPoints: Point2[],
  epsilon: number
): number {
  const samples = buildCoverageSamples(subjectPoints, subjectCentroid);

  if (samples.length === 0) {
    return 0;
  }

  const coveredSamples = samples.filter((sample) => (
    containsPoint(containerPoints, sample, epsilon)
  ));

  return coveredSamples.length / samples.length;
}

export function rebuildZones(
  document: ArchitectureDocument,
  epsilon = 1e-6
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const loops = findClosedLoops(next, epsilon);
  const previousZoneIdBySignature = new Map<string, string>();
  const previousZoneById = new Map<string, Zone>();
  const previousZoneStateById = new Map<string, PreviousZoneMatchState>();
  const usedZoneIds = new Set<string>();

  for (const zoneId of document.zoneOrder) {
    const zone = document.zones[zoneId];

    if (!zone) {
      continue;
    }

    const signature = createBoundarySignature(document, zone.boundaryVertexIds, epsilon);
    previousZoneIdBySignature.set(
      createLevelScopedSignature(zone.levelId, signature),
      zoneId
    );
    previousZoneById.set(zoneId, zone);
    previousZoneStateById.set(zoneId, {
      geometry: buildBoundaryGeometry(document, zone.boundaryVertexIds, epsilon),
      signature,
      zone,
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

  const reusableZoneIdByLoopIndex = new Map<number, string>();

  for (const [loopIndex, loop] of loopStates.entries()) {
    const matchedZoneId = previousZoneIdBySignature.get(
      createLevelScopedSignature(loop.levelId, loop.signature)
    );

    if (!matchedZoneId || usedZoneIds.has(matchedZoneId)) {
      continue;
    }

    reusableZoneIdByLoopIndex.set(loopIndex, matchedZoneId);
    usedZoneIds.add(matchedZoneId);
  }

  const overlapCandidates: OverlapMatchCandidate[] = [];

  for (const [loopIndex, loop] of loopStates.entries()) {
    if (reusableZoneIdByLoopIndex.has(loopIndex)) {
      continue;
    }

    for (const [zoneId, previousState] of previousZoneStateById.entries()) {
      if (
        usedZoneIds.has(zoneId) ||
        previousState.zone.levelId !== loop.levelId ||
        !previousState.geometry
      ) {
        continue;
      }

      const overlapArea = computePolygonOverlapArea(
        previousState.geometry.points,
        loop.points,
        epsilon
      );
      let overlapOldRatio = overlapArea / previousState.geometry.area;
      let overlapNewRatio = overlapArea / loop.area;

      if (
        overlapOldRatio < MIN_ZONE_ID_OVERLAP_RATIO ||
        overlapNewRatio < MIN_ZONE_ID_OVERLAP_RATIO
      ) {
        overlapOldRatio = computeCoverageRatio(
          previousState.geometry.points,
          previousState.geometry.centroid,
          loop.points,
          epsilon
        );
        overlapNewRatio = computeCoverageRatio(
          loop.points,
          loop.centroid,
          previousState.geometry.points,
          epsilon
        );
      }

      if (
        overlapOldRatio < MIN_ZONE_ID_OVERLAP_RATIO ||
        overlapNewRatio < MIN_ZONE_ID_OVERLAP_RATIO
      ) {
        continue;
      }

      overlapCandidates.push({
        centroidDistance: distanceBetweenPoints(
          previousState.geometry.centroid,
          loop.centroid
        ),
        loopIndex,
        overlapArea: overlapArea > 0
          ? overlapArea
          : Math.min(
            overlapOldRatio * previousState.geometry.area,
            overlapNewRatio * loop.area
          ),
        overlapNewRatio,
        overlapOldRatio,
        zoneId,
      });
    }
  }

  overlapCandidates.sort((left, right) => {
    if (right.overlapArea !== left.overlapArea) {
      return right.overlapArea - left.overlapArea;
    }

    if (right.overlapOldRatio !== left.overlapOldRatio) {
      return right.overlapOldRatio - left.overlapOldRatio;
    }

    if (right.overlapNewRatio !== left.overlapNewRatio) {
      return right.overlapNewRatio - left.overlapNewRatio;
    }

    if (left.centroidDistance !== right.centroidDistance) {
      return left.centroidDistance - right.centroidDistance;
    }

    return left.zoneId.localeCompare(right.zoneId);
  });

  for (const candidate of overlapCandidates) {
    if (
      reusableZoneIdByLoopIndex.has(candidate.loopIndex) ||
      usedZoneIds.has(candidate.zoneId)
    ) {
      continue;
    }

    reusableZoneIdByLoopIndex.set(candidate.loopIndex, candidate.zoneId);
    usedZoneIds.add(candidate.zoneId);
  }

  next.zones = {};
  next.zoneOrder = [];

  for (const [loopIndex, loop] of loopStates.entries()) {
    const reusableZoneId = reusableZoneIdByLoopIndex.get(loopIndex) ?? null;
    const zoneId = reusableZoneId ?? crypto.randomUUID();
    const previousZone = reusableZoneId
      ? previousZoneById.get(reusableZoneId)
      : null;

    next.zones[zoneId] = {
      id: zoneId,
      levelId: loop.levelId,
      boundaryVertexIds: loop.canonicalBoundaryVertexIds,
      kind: previousZone?.kind ?? 'unknown',
      name: previousZone?.name ?? null,
    };
    next.zoneOrder.push(zoneId);
  }

  return syncLevelEntityIds(next);
}
