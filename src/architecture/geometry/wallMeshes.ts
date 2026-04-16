import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import { cross2D, dot2D } from '../topology/math.js';

export interface WallMeshDescriptor {
  wallId: string;
  levelId: string;
  origin: Point2;
  length: number;
  thickness: number;
  height: number;
  angle: number;
  start: Point2;
  end: Point2;
  footprintPoints: Point2[];
}

export function buildWallMeshDescriptors(document: ArchitectureDocument): WallMeshDescriptor[] {
  const junctions = buildWallJunctionMap(document);

  return document.wallOrder.flatMap((wallId) => {
    const wall = document.walls[wallId];

    if (!wall) {
      return [];
    }

    const startVertex = document.vertices[wall.startVertexId];
    const endVertex = document.vertices[wall.endVertexId];

    if (!startVertex || !endVertex) {
      return [];
    }

    const start: Point2 = [startVertex.x, startVertex.y];
    const end: Point2 = [endVertex.x, endVertex.y];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const angle = Math.atan2(dy, dx);
    const localFootprint = buildLocalFootprint({
      start,
      end,
      thickness: wall.thickness,
      startJunction: junctions.get(wall.startVertexId)?.get(wall.id) ?? null,
      endJunction: junctions.get(wall.endVertexId)?.get(wall.id) ?? null,
    });

    return [{
      wallId,
      levelId: wall.levelId,
      origin: start,
      length: Math.hypot(dx, dy),
      thickness: wall.thickness,
      height: wall.height,
      angle,
      start,
      end,
      footprintPoints: localFootprint,
    }];
  });
}

interface JunctionEdgePoint {
  left: Point2;
  right: Point2;
}

function buildWallJunctionMap(document: ArchitectureDocument): Map<string, Map<string, JunctionEdgePoint>> {
  const adjacency = new Map<string, Array<{
    wallId: string;
    thickness: number;
    point: Point2;
    direction: Point2;
    angle: number;
  }>>();

  for (const wallId of document.wallOrder) {
    const wall = document.walls[wallId];
    if (!wall) {
      continue;
    }

    const startVertex = document.vertices[wall.startVertexId];
    const endVertex = document.vertices[wall.endVertexId];
    if (!startVertex || !endVertex) {
      continue;
    }

    const startPoint: Point2 = [startVertex.x, startVertex.y];
    const endPoint: Point2 = [endVertex.x, endVertex.y];
    const startDirection: Point2 = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]];
    const endDirection: Point2 = [startPoint[0] - endPoint[0], startPoint[1] - endPoint[1]];

    const startEdges = adjacency.get(wall.startVertexId) ?? [];
    startEdges.push({
      wallId,
      thickness: wall.thickness,
      point: startPoint,
      direction: startDirection,
      angle: Math.atan2(startDirection[1], startDirection[0]),
    });
    adjacency.set(wall.startVertexId, startEdges);

    const endEdges = adjacency.get(wall.endVertexId) ?? [];
    endEdges.push({
      wallId,
      thickness: wall.thickness,
      point: endPoint,
      direction: endDirection,
      angle: Math.atan2(endDirection[1], endDirection[0]),
    });
    adjacency.set(wall.endVertexId, endEdges);
  }

  const result = new Map<string, Map<string, JunctionEdgePoint>>();

  for (const [vertexId, edges] of adjacency.entries()) {
    if (edges.length < 2) {
      continue;
    }

    const sortedEdges = [...edges].sort((a, b) => a.angle - b.angle);
    const junction = new Map<string, JunctionEdgePoint>();

    for (let index = 0; index < sortedEdges.length; index += 1) {
      const current = sortedEdges[index];
      const next = sortedEdges[(index + 1) % sortedEdges.length];
      const intersection = intersectOffsetEdges(current, next);

      if (!intersection) {
        continue;
      }

      const currentEntry = junction.get(current.wallId) ?? fallbackJunctionEdge(current);
      currentEntry.left = intersection;
      junction.set(current.wallId, currentEntry);

      const nextEntry = junction.get(next.wallId) ?? fallbackJunctionEdge(next);
      nextEntry.right = intersection;
      junction.set(next.wallId, nextEntry);
    }

    const tBranchWallId = findTJunctionBranchWallId(sortedEdges);
    if (tBranchWallId) {
      for (const edge of sortedEdges) {
        junction.set(edge.wallId, fallbackJunctionEdge(edge));
      }
    }

    if (isCrossJunction(sortedEdges)) {
      for (const edge of sortedEdges) {
        junction.set(edge.wallId, fallbackJunctionEdge(edge));
      }
    }

    result.set(vertexId, junction);
  }

  return result;
}

function findTJunctionBranchWallId(edges: Array<{
  wallId: string;
  thickness: number;
  point: Point2;
  direction: Point2;
  angle: number;
}>): string | null {
  if (edges.length !== 3) {
    return null;
  }

  for (let index = 0; index < edges.length; index += 1) {
    const first = edges[index];

    for (let nextIndex = index + 1; nextIndex < edges.length; nextIndex += 1) {
      const second = edges[nextIndex];
      const cross = Math.abs(cross2D(first.direction, second.direction));
      const dot = dot2D(first.direction, second.direction);

      if (cross > 1e-9 || dot >= 0) {
        continue;
      }

      return edges.find((edge) => edge.wallId !== first.wallId && edge.wallId !== second.wallId)?.wallId ?? null;
    }
  }

  return null;
}

function isCrossJunction(edges: Array<{
  wallId: string;
  thickness: number;
  point: Point2;
  direction: Point2;
  angle: number;
}>): boolean {
  if (edges.length !== 4) {
    return false;
  }

  let oppositePairCount = 0;

  for (let index = 0; index < edges.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < edges.length; nextIndex += 1) {
      const first = edges[index];
      const second = edges[nextIndex];
      const cross = Math.abs(cross2D(first.direction, second.direction));
      const dot = dot2D(first.direction, second.direction);

      if (cross <= 1e-9 && dot < 0) {
        oppositePairCount += 1;
      }
    }
  }

  return oppositePairCount === 2;
}

function fallbackJunctionEdge(edge: { point: Point2; direction: Point2; thickness: number }): JunctionEdgePoint {
  const halfThickness = edge.thickness / 2;
  const normal = normalizeLeftNormal(edge.direction);

  return {
    left: [
      edge.point[0] + (normal[0] * halfThickness),
      edge.point[1] + (normal[1] * halfThickness),
    ],
    right: [
      edge.point[0] - (normal[0] * halfThickness),
      edge.point[1] - (normal[1] * halfThickness),
    ],
  };
}

function intersectOffsetEdges(
  current: { point: Point2; direction: Point2; thickness: number },
  next: { point: Point2; direction: Point2; thickness: number },
): Point2 | null {
  const currentNormal = normalizeLeftNormal(current.direction);
  const nextNormal = normalizeLeftNormal(next.direction);
  const currentHalf = current.thickness / 2;
  const nextHalf = next.thickness / 2;

  const currentLeftPoint: Point2 = [
    current.point[0] + (currentNormal[0] * currentHalf),
    current.point[1] + (currentNormal[1] * currentHalf),
  ];
  const nextRightPoint: Point2 = [
    next.point[0] - (nextNormal[0] * nextHalf),
    next.point[1] - (nextNormal[1] * nextHalf),
  ];

  return intersectInfiniteLines(currentLeftPoint, current.direction, nextRightPoint, next.direction);
}

function intersectInfiniteLines(originA: Point2, directionA: Point2, originB: Point2, directionB: Point2): Point2 | null {
  const denominator = cross2D(directionA, directionB);

  if (Math.abs(denominator) <= 1e-9) {
    return null;
  }

  const delta: Point2 = [originB[0] - originA[0], originB[1] - originA[1]];
  const t = cross2D(delta, directionB) / denominator;

  return [
    originA[0] + (directionA[0] * t),
    originA[1] + (directionA[1] * t),
  ];
}

function normalizeLeftNormal(direction: Point2): Point2 {
  const length = Math.hypot(direction[0], direction[1]);

  if (length <= 1e-9) {
    return [0, 0];
  }

  return [
    -direction[1] / length,
    direction[0] / length,
  ];
}

function worldToLocal(origin: Point2, angle: number, point: Point2): Point2 {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    (dx * cos) + (dy * sin),
    (-dx * sin) + (dy * cos),
  ];
}

function buildLocalFootprint(args: {
  start: Point2;
  end: Point2;
  thickness: number;
  startJunction: JunctionEdgePoint | null;
  endJunction: JunctionEdgePoint | null;
}): Point2[] {
  const { start, end, thickness, startJunction, endJunction } = args;
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const normal = normalizeLeftNormal([end[0] - start[0], end[1] - start[1]]);
  const halfThickness = thickness / 2;
  const startLeft = startJunction?.left ?? [start[0] + (normal[0] * halfThickness), start[1] + (normal[1] * halfThickness)];
  const startRight = startJunction?.right ?? [start[0] - (normal[0] * halfThickness), start[1] - (normal[1] * halfThickness)];
  const endLeft = endJunction?.right ?? [end[0] + (normal[0] * halfThickness), end[1] + (normal[1] * halfThickness)];
  const endRight = endJunction?.left ?? [end[0] - (normal[0] * halfThickness), end[1] - (normal[1] * halfThickness)];

  const footprint: Point2[] = [
    worldToLocal(start, angle, startRight),
    worldToLocal(start, angle, endRight),
  ];

  footprint.push(worldToLocal(start, angle, endLeft));

  footprint.push(worldToLocal(start, angle, startLeft));

  return dedupeSequentialPoints(footprint);
}

function dedupeSequentialPoints(points: Point2[]): Point2[] {
  const deduped: Point2[] = [];

  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (previous && dot2D([previous[0] - point[0], previous[1] - point[1]], [previous[0] - point[0], previous[1] - point[1]]) <= 1e-12) {
      continue;
    }

    deduped.push(point);
  }

  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (first && last && dot2D([first[0] - last[0], first[1] - last[1]], [first[0] - last[0], first[1] - last[1]]) <= 1e-12) {
      deduped.pop();
    }
  }

  return deduped;
}
