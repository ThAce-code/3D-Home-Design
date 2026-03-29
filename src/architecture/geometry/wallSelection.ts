import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import { distanceBetweenPoints, dot2D, subtractPoints } from '../topology/math.js';

function distancePointToSegment(point: Point2, start: Point2, end: Point2): number {
  const segment = subtractPoints(end, start);
  const pointOffset = subtractPoints(point, start);
  const lengthSquared = dot2D(segment, segment);

  if (lengthSquared <= 1e-9) {
    return distanceBetweenPoints(point, start);
  }

  const t = Math.min(1, Math.max(0, dot2D(pointOffset, segment) / lengthSquared));
  const closestPoint: Point2 = [
    start[0] + (segment[0] * t),
    start[1] + (segment[1] * t),
  ];

  return distanceBetweenPoints(point, closestPoint);
}

export function isPointNearWallFootprint(
  document: ArchitectureDocument,
  wallId: string,
  point: Point2,
  epsilon = 1e-6
): boolean {
  const wall = document.walls[wallId];

  if (!wall) {
    return false;
  }

  const startVertex = document.vertices[wall.startVertexId];
  const endVertex = document.vertices[wall.endVertexId];

  if (!startVertex || !endVertex) {
    return false;
  }

  return distancePointToSegment(
    point,
    [startVertex.x, startVertex.y],
    [endVertex.x, endVertex.y]
  ) <= ((wall.thickness / 2) + epsilon);
}
