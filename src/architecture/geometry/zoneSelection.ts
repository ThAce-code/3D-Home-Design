import type { ArchitectureDocument } from '../domain/document.js';
import { buildFloorPolygons } from './floorPolygons.js';
import { cross2D, dot2D, subtractPoints, type Point2 } from '../topology/math.js';

function isPointOnSegment(point: Point2, start: Point2, end: Point2, epsilon: number): boolean {
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

export function findZoneIdContainingPoint(
  document: ArchitectureDocument,
  point: Point2,
  epsilon = 1e-6
): string | null {
  for (const polygon of buildFloorPolygons(document)) {
    if (containsPoint(polygon.points, point, epsilon)) {
      return polygon.zoneId;
    }
  }

  return null;
}
