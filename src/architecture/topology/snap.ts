import {
  distanceBetweenPoints,
  isWithinTolerance,
  type Point2,
  type XYLike,
} from './math.js';

export interface SnapResult {
  point: Point2;
  vertexId: string | null;
  distance: number | null;
}

export function snapPointToVertices<TVertex extends XYLike & { id: string }>(
  point: Point2,
  vertices: TVertex[],
  tolerance: number
): SnapResult {
  let nearestVertex: TVertex | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const vertex of vertices) {
    const distance = distanceBetweenPoints(point, [vertex.x, vertex.y]);

    if (distance < nearestDistance) {
      nearestVertex = vertex;
      nearestDistance = distance;
    }
  }

  if (!nearestVertex || !isWithinTolerance(nearestDistance, tolerance)) {
    return {
      point,
      vertexId: null,
      distance: null,
    };
  }

  return {
    point: [nearestVertex.x, nearestVertex.y],
    vertexId: nearestVertex.id,
    distance: nearestDistance,
  };
}
