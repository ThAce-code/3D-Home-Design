import { cross2D, subtractPoints, type Point2 } from './math.js';

export interface SegmentIntersection {
  point: Point2;
  t: number;
  u: number;
}

const DEFAULT_EPSILON = 1e-9;

export function intersectSegments(
  startA: Point2,
  endA: Point2,
  startB: Point2,
  endB: Point2,
  epsilon = DEFAULT_EPSILON
): SegmentIntersection | null {
  const segmentA = subtractPoints(endA, startA);
  const segmentB = subtractPoints(endB, startB);
  const offset = subtractPoints(startB, startA);
  const denominator = cross2D(segmentA, segmentB);

  if (Math.abs(denominator) <= epsilon) {
    return null;
  }

  const t = cross2D(offset, segmentB) / denominator;
  const u = cross2D(offset, segmentA) / denominator;

  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) {
    return null;
  }

  return {
    point: [
      startA[0] + (segmentA[0] * t),
      startA[1] + (segmentA[1] * t),
    ],
    t,
    u,
  };
}
