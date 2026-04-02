import { cross2D, distanceBetweenPoints, dot2D, subtractPoints, type Point2 } from './math.js';

interface BoundaryGeometry {
  area: number;
  centroid: Point2;
  points: Point2[];
}

interface PreviousZoneMatchState {
  geometry: BoundaryGeometry | null;
  levelId: string;
  signature: string;
  zoneId: string;
}

interface LoopMatchState {
  area: number;
  centroid: Point2;
  levelId: string;
  points: Point2[];
  signature: string;
}

interface OverlapMatchCandidate {
  centroidDistance: number;
  boundarySimilarity: number;
  loopIndex: number;
  overlapArea: number;
  overlapNewRatio: number;
  overlapOldRatio: number;
  zoneId: string;
}

export interface PreviousZoneMatchInput {
  geometry: {
    area: number;
    centroid: Point2;
    points: Point2[];
  } | null;
  levelId: string;
  signature: string;
  zoneId: string;
}

export interface NextLoopMatchInput {
  area: number;
  centroid: Point2;
  levelId: string;
  points: Point2[];
  signature: string;
}

export interface MatchZonesArgs {
  epsilon: number;
  nextLoops: NextLoopMatchInput[];
  previousZones: PreviousZoneMatchInput[];
}

export interface MatchZonesResult {
  reusedZoneIdByLoopIndex: Map<number, string>;
}

const MIN_ZONE_ID_OVERLAP_RATIO = 0.6;
const MIN_AMBIGUITY_GAP_RATIO = 0.1;
const MIN_SPLIT_ZONE_OVERLAP_RATIO = 0.2;
const MIN_SPLIT_ZONE_WINNER_RATIO = 0.4;

function createLevelScopedSignature(levelId: string, signature: string): string {
  return `${levelId}::${signature}`;
}

function computeBoundarySimilarity(previousSignature: string, nextSignature: string): number {
  const previousParts = previousSignature.split('|').filter(Boolean);
  const nextParts = new Set(nextSignature.split('|').filter(Boolean));

  if (previousParts.length === 0) {
    return 0;
  }

  let sharedParts = 0;

  for (const part of previousParts) {
    if (nextParts.has(part)) {
      sharedParts += 1;
    }
  }

  return sharedParts / previousParts.length;
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

interface OverlapCandidateCollections {
  byLoopIndex: Map<number, OverlapMatchCandidate[]>;
  byZoneId: Map<string, OverlapMatchCandidate[]>;
}

function collectOverlapCandidates(
  previousZones: PreviousZoneMatchState[],
  nextLoops: LoopMatchState[],
  reusableZoneIdByLoopIndex: Map<number, string>,
  epsilon: number
): OverlapCandidateCollections {
  const usedZoneIds = new Set(reusableZoneIdByLoopIndex.values());
  const byLoopIndex = new Map<number, OverlapMatchCandidate[]>();
  const byZoneId = new Map<string, OverlapMatchCandidate[]>();

  for (const [loopIndex, loop] of nextLoops.entries()) {
    if (reusableZoneIdByLoopIndex.has(loopIndex)) {
      continue;
    }

    for (const previousZone of previousZones) {
      if (
        usedZoneIds.has(previousZone.zoneId) ||
        previousZone.levelId !== loop.levelId ||
        !previousZone.geometry
      ) {
        continue;
      }

      const overlapArea = computePolygonOverlapArea(
        previousZone.geometry.points,
        loop.points,
        epsilon
      );
      let overlapOldRatio = overlapArea / previousZone.geometry.area;
      let overlapNewRatio = overlapArea / loop.area;

      if (
        overlapOldRatio < MIN_ZONE_ID_OVERLAP_RATIO ||
        overlapNewRatio < MIN_ZONE_ID_OVERLAP_RATIO
      ) {
        overlapOldRatio = computeCoverageRatio(
          previousZone.geometry.points,
          previousZone.geometry.centroid,
          loop.points,
          epsilon
        );
        overlapNewRatio = computeCoverageRatio(
          loop.points,
          loop.centroid,
          previousZone.geometry.points,
          epsilon
        );
      }

      const candidate = {
        boundarySimilarity: computeBoundarySimilarity(
          previousZone.signature,
          loop.signature
        ),
        centroidDistance: distanceBetweenPoints(
          previousZone.geometry.centroid,
          loop.centroid
        ),
        loopIndex,
        overlapArea: overlapArea > 0
          ? overlapArea
          : Math.min(
            overlapOldRatio * previousZone.geometry.area,
            overlapNewRatio * loop.area
          ),
        overlapNewRatio,
        overlapOldRatio,
        zoneId: previousZone.zoneId,
      };

      const loopCandidates = byLoopIndex.get(loopIndex) ?? [];
      loopCandidates.push(candidate);
      byLoopIndex.set(loopIndex, loopCandidates);

      const zoneCandidates = byZoneId.get(previousZone.zoneId) ?? [];
      zoneCandidates.push(candidate);
      byZoneId.set(previousZone.zoneId, zoneCandidates);
    }
  }

  return {
    byLoopIndex,
    byZoneId,
  };
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

function matchBySignature(
  previousZones: PreviousZoneMatchState[],
  nextLoops: LoopMatchState[]
): Map<number, string> {
  const previousZoneIdBySignature = new Map<string, string>();
  const reusableZoneIdByLoopIndex = new Map<number, string>();
  const usedZoneIds = new Set<string>();

  for (const previousZone of previousZones) {
    previousZoneIdBySignature.set(
      createLevelScopedSignature(previousZone.levelId, previousZone.signature),
      previousZone.zoneId
    );
  }

  for (const [loopIndex, loop] of nextLoops.entries()) {
    const matchedZoneId = previousZoneIdBySignature.get(
      createLevelScopedSignature(loop.levelId, loop.signature)
    );

    if (!matchedZoneId || usedZoneIds.has(matchedZoneId)) {
      continue;
    }

    reusableZoneIdByLoopIndex.set(loopIndex, matchedZoneId);
    usedZoneIds.add(matchedZoneId);
  }

  return reusableZoneIdByLoopIndex;
}

function matchByOverlap(
  previousZones: PreviousZoneMatchState[],
  nextLoops: LoopMatchState[],
  reusableZoneIdByLoopIndex: Map<number, string>,
  epsilon: number
): Map<number, string> {
  const { byLoopIndex } = collectOverlapCandidates(
    previousZones,
    nextLoops,
    reusableZoneIdByLoopIndex,
    epsilon
  );
  const overlapCandidates: OverlapMatchCandidate[] = [];

  for (const [loopIndex, candidates] of byLoopIndex.entries()) {
    const filteredCandidates = candidates.filter((candidate) => (
      candidate.overlapOldRatio >= MIN_ZONE_ID_OVERLAP_RATIO &&
      candidate.overlapNewRatio >= MIN_ZONE_ID_OVERLAP_RATIO
    ));

    if (filteredCandidates.length === 0) {
      continue;
    }

    filteredCandidates.sort((left, right) => {
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

      if (right.boundarySimilarity !== left.boundarySimilarity) {
        return right.boundarySimilarity - left.boundarySimilarity;
      }

      return left.zoneId.localeCompare(right.zoneId);
    });

    const bestCandidate = filteredCandidates[0];
    const secondCandidate = filteredCandidates[1];

    if (!bestCandidate) {
      continue;
    }

    if (
      secondCandidate &&
      bestCandidate.overlapArea > 0 &&
      (bestCandidate.overlapArea - secondCandidate.overlapArea) / bestCandidate.overlapArea < MIN_AMBIGUITY_GAP_RATIO
    ) {
      continue;
    }

    overlapCandidates.push({
      ...bestCandidate,
      loopIndex,
    });
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

    if (right.boundarySimilarity !== left.boundarySimilarity) {
      return right.boundarySimilarity - left.boundarySimilarity;
    }

    return left.zoneId.localeCompare(right.zoneId);
  });

  const usedZoneIds = new Set(reusableZoneIdByLoopIndex.values());

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

  return reusableZoneIdByLoopIndex;
}

function matchBySplit(
  previousZones: PreviousZoneMatchState[],
  nextLoops: LoopMatchState[],
  reusableZoneIdByLoopIndex: Map<number, string>,
  epsilon: number
): Map<number, string> {
  const { byZoneId } = collectOverlapCandidates(
    previousZones,
    nextLoops,
    reusableZoneIdByLoopIndex,
    epsilon
  );
  const usedZoneIds = new Set(reusableZoneIdByLoopIndex.values());

  for (const previousZone of previousZones) {
    if (usedZoneIds.has(previousZone.zoneId)) {
      continue;
    }

    const candidates = (byZoneId.get(previousZone.zoneId) ?? []).filter((candidate) => (
      candidate.overlapOldRatio >= MIN_SPLIT_ZONE_OVERLAP_RATIO &&
      candidate.overlapNewRatio >= MIN_SPLIT_ZONE_OVERLAP_RATIO &&
      !reusableZoneIdByLoopIndex.has(candidate.loopIndex)
    ));

    if (candidates.length < 2) {
      continue;
    }

    candidates.sort((left, right) => {
      if (right.overlapArea !== left.overlapArea) {
        return right.overlapArea - left.overlapArea;
      }

      if (right.overlapOldRatio !== left.overlapOldRatio) {
        return right.overlapOldRatio - left.overlapOldRatio;
      }

      if (left.centroidDistance !== right.centroidDistance) {
        return left.centroidDistance - right.centroidDistance;
      }

      if (right.boundarySimilarity !== left.boundarySimilarity) {
        return right.boundarySimilarity - left.boundarySimilarity;
      }

      return left.zoneId.localeCompare(right.zoneId);
    });

    const bestCandidate = candidates[0];
    const secondCandidate = candidates[1];

    if (!bestCandidate || bestCandidate.overlapOldRatio < MIN_SPLIT_ZONE_WINNER_RATIO) {
      continue;
    }

    if (
      secondCandidate &&
      bestCandidate.overlapArea > 0 &&
      (bestCandidate.overlapArea - secondCandidate.overlapArea) / bestCandidate.overlapArea < MIN_AMBIGUITY_GAP_RATIO
    ) {
      continue;
    }

    reusableZoneIdByLoopIndex.set(bestCandidate.loopIndex, previousZone.zoneId);
    usedZoneIds.add(previousZone.zoneId);
  }

  return reusableZoneIdByLoopIndex;
}

export function matchZones(args: MatchZonesArgs): MatchZonesResult {
  const previousZones: PreviousZoneMatchState[] = args.previousZones;
  const nextLoops: LoopMatchState[] = args.nextLoops;
  const reusableZoneIdByLoopIndex = matchBySignature(previousZones, nextLoops);
  const overlappedZoneIds = matchByOverlap(
    previousZones,
    nextLoops,
    reusableZoneIdByLoopIndex,
    args.epsilon
  );
  return {
    reusedZoneIdByLoopIndex: matchBySplit(
      previousZones,
      nextLoops,
      overlappedZoneIds,
      args.epsilon
    ),
  };
}
