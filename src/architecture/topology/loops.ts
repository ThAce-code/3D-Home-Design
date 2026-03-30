import type { ArchitectureDocument } from '../domain/document.js';
import { intersectSegments } from './intersections.js';
import type { Point2 } from './math.js';

interface AdjacencyEdge {
  wallId: string;
  otherVertexId: string;
  angle: number;
}

export interface ClosedLoop {
  levelId: string;
  vertexIds: string[];
  wallIds: string[];
}

// V1 loop extraction intentionally only accepts disconnected simple cycles.
// Graphs with shared walls or higher-order faces are rejected for now.

function compareVertexIds(
  leftVertexId: string,
  rightVertexId: string,
  document: ArchitectureDocument
): number {
  const leftVertex = document.vertices[leftVertexId];
  const rightVertex = document.vertices[rightVertexId];

  if (!leftVertex || !rightVertex) {
    return leftVertexId.localeCompare(rightVertexId);
  }

  if (leftVertex.x !== rightVertex.x) {
    return leftVertex.x - rightVertex.x;
  }

  if (leftVertex.y !== rightVertex.y) {
    return leftVertex.y - rightVertex.y;
  }

  return leftVertexId.localeCompare(rightVertexId);
}

function getPoint(document: ArchitectureDocument, vertexId: string): Point2 {
  const vertex = document.vertices[vertexId];

  if (!vertex) {
    throw new Error(`Missing vertex "${vertexId}" while building loops.`);
  }

  return [vertex.x, vertex.y];
}

function getSignedArea(points: Point2[]): number {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += (current[0] * next[1]) - (next[0] * current[1]);
  }

  return area / 2;
}

function isSamePoint(left: Point2, right: Point2, epsilon: number): boolean {
  return (
    Math.abs(left[0] - right[0]) <= epsilon &&
    Math.abs(left[1] - right[1]) <= epsilon
  );
}

function isEndpointOnlyIntersection(
  hitPoint: Point2,
  startA: Point2,
  endA: Point2,
  startB: Point2,
  endB: Point2,
  epsilon: number
): boolean {
  const touchesEndpointOnA = (
    isSamePoint(hitPoint, startA, epsilon) ||
    isSamePoint(hitPoint, endA, epsilon)
  );
  const touchesEndpointOnB = (
    isSamePoint(hitPoint, startB, epsilon) ||
    isSamePoint(hitPoint, endB, epsilon)
  );

  return touchesEndpointOnA && touchesEndpointOnB;
}

function sharesEndpoint(indexA: number, indexB: number, edgeCount: number): boolean {
  if (indexA === indexB) {
    return true;
  }

  if (Math.abs(indexA - indexB) === 1) {
    return true;
  }

  return Math.abs(indexA - indexB) === edgeCount - 1;
}

function hasSelfIntersection(points: Point2[], epsilon: number): boolean {
  const edgeCount = points.length;

  for (let indexA = 0; indexA < edgeCount; indexA += 1) {
    const startA = points[indexA];
    const endA = points[(indexA + 1) % edgeCount];

    for (let indexB = indexA + 1; indexB < edgeCount; indexB += 1) {
      if (sharesEndpoint(indexA, indexB, edgeCount)) {
        continue;
      }

      const startB = points[indexB];
      const endB = points[(indexB + 1) % edgeCount];
      const hit = intersectSegments(startA, endA, startB, endB, epsilon);

      if (hit && !isEndpointOnlyIntersection(hit.point, startA, endA, startB, endB, epsilon)) {
        return true;
      }
    }
  }

  return false;
}

function buildAdjacency(
  document: ArchitectureDocument,
  levelId: string
): Map<string, AdjacencyEdge[]> {
  const adjacency = new Map<string, AdjacencyEdge[]>();

  for (const wallId of document.wallOrder) {
    const wall = document.walls[wallId];

    if (!wall || wall.levelId !== levelId) {
      continue;
    }

    const startEdges = adjacency.get(wall.startVertexId) ?? [];
    startEdges.push({
      wallId,
      otherVertexId: wall.endVertexId,
      angle: Math.atan2(
        getPoint(document, wall.endVertexId)[1] - getPoint(document, wall.startVertexId)[1],
        getPoint(document, wall.endVertexId)[0] - getPoint(document, wall.startVertexId)[0],
      ),
    });
    adjacency.set(wall.startVertexId, startEdges);

    const endEdges = adjacency.get(wall.endVertexId) ?? [];
    endEdges.push({
      wallId,
      otherVertexId: wall.startVertexId,
      angle: Math.atan2(
        getPoint(document, wall.startVertexId)[1] - getPoint(document, wall.endVertexId)[1],
        getPoint(document, wall.startVertexId)[0] - getPoint(document, wall.endVertexId)[0],
      ),
    });
    adjacency.set(wall.endVertexId, endEdges);
  }

  return adjacency;
}

function buildCoreAdjacency(adjacency: Map<string, AdjacencyEdge[]>): Map<string, AdjacencyEdge[]> {
  const core = new Map<string, AdjacencyEdge[]>(
    [...adjacency.entries()].map(([vertexId, edges]) => [vertexId, [...edges]])
  );
  const queue: string[] = [...core.entries()]
    .filter(([, edges]) => edges.length < 2)
    .map(([vertexId]) => vertexId);
  const removed = new Set<string>();

  while (queue.length > 0) {
    const vertexId = queue.pop();

    if (!vertexId || removed.has(vertexId)) {
      continue;
    }

    removed.add(vertexId);
    const edges = core.get(vertexId) ?? [];

    for (const edge of edges) {
      const neighborEdges = core.get(edge.otherVertexId);
      if (!neighborEdges) {
        continue;
      }

      const nextNeighborEdges = neighborEdges.filter((neighborEdge) => neighborEdge.otherVertexId !== vertexId);
      core.set(edge.otherVertexId, nextNeighborEdges);

      if (!removed.has(edge.otherVertexId) && nextNeighborEdges.length < 2) {
        queue.push(edge.otherVertexId);
      }
    }

    core.delete(vertexId);
  }

  return core;
}

function collectConnectedVertexIds(
  startVertexId: string,
  adjacency: Map<string, AdjacencyEdge[]>
): string[] {
  const visited = new Set<string>();
  const stack = [startVertexId];

  while (stack.length > 0) {
    const vertexId = stack.pop();

    if (!vertexId || visited.has(vertexId)) {
      continue;
    }

    visited.add(vertexId);

    for (const edge of adjacency.get(vertexId) ?? []) {
      if (!visited.has(edge.otherVertexId)) {
        stack.push(edge.otherVertexId);
      }
    }
  }

  return [...visited];
}

function createHalfEdgeKey(fromVertexId: string, edge: AdjacencyEdge): string {
  return `${fromVertexId}|${edge.otherVertexId}|${edge.wallId}`;
}

function traceFace(
  document: ArchitectureDocument,
  adjacency: Map<string, AdjacencyEdge[]>,
  startVertexId: string,
  startEdge: AdjacencyEdge,
  epsilon: number
): ClosedLoop | null {
  const loopVertexIds: string[] = [];
  const loopWallIds: string[] = [];
  let previousVertexId = startVertexId;
  let currentVertexId = startEdge.otherVertexId;
  let currentEdge = startEdge;
  const startHalfEdgeKey = createHalfEdgeKey(startVertexId, startEdge);
  const visitedHalfEdges = new Set<string>();

  while (true) {
    const currentHalfEdgeKey = createHalfEdgeKey(previousVertexId, currentEdge);
    if (visitedHalfEdges.has(currentHalfEdgeKey)) {
      return null;
    }
    visitedHalfEdges.add(currentHalfEdgeKey);

    loopVertexIds.push(previousVertexId);
    loopWallIds.push(currentEdge.wallId);

    const outgoingEdges = adjacency.get(currentVertexId) ?? [];
    const reverseEdgeIndex = outgoingEdges.findIndex((edge) => (
      edge.otherVertexId === previousVertexId && edge.wallId === currentEdge.wallId
    ));

    if (reverseEdgeIndex === -1 || outgoingEdges.length === 0) {
      return null;
    }

    const nextEdge = outgoingEdges[(reverseEdgeIndex - 1 + outgoingEdges.length) % outgoingEdges.length];
    if (!nextEdge) {
      return null;
    }

    previousVertexId = currentVertexId;
    currentVertexId = nextEdge.otherVertexId;
    currentEdge = nextEdge;

    if (createHalfEdgeKey(previousVertexId, currentEdge) === startHalfEdgeKey) {
      break;
    }
  }

  const points = loopVertexIds.map((vertexId) => getPoint(document, vertexId));
  const signedArea = getSignedArea(points);

  if (Math.abs(signedArea) <= epsilon || hasSelfIntersection(points, epsilon)) {
    return null;
  }

  if (signedArea <= 0) {
    return null;
  }

  return {
    levelId: document.walls[loopWallIds[0]]?.levelId ?? document.levelOrder[0] ?? '',
    vertexIds: loopVertexIds,
    wallIds: loopWallIds,
  };
}

export function findClosedLoops(
  document: ArchitectureDocument,
  epsilon = 1e-6
): ClosedLoop[] {
  const loops: ClosedLoop[] = [];

  for (const levelId of document.levelOrder) {
    const adjacency = buildCoreAdjacency(buildAdjacency(document, levelId));
    for (const edges of adjacency.values()) {
      edges.sort((left, right) => left.angle - right.angle);
    }

    const visitedHalfEdges = new Set<string>();

    for (const [vertexId, edges] of adjacency.entries()) {
      for (const edge of edges) {
        const halfEdgeKey = createHalfEdgeKey(vertexId, edge);
        if (visitedHalfEdges.has(halfEdgeKey)) {
          continue;
        }

        const loop = traceFace(
          document,
          adjacency,
          vertexId,
          edge,
          epsilon,
        );

        if (!loop) {
          visitedHalfEdges.add(halfEdgeKey);
          continue;
        }

        loop.vertexIds.forEach((fromVertexId, index) => {
          const wallId = loop.wallIds[index];
          const toVertexId = loop.vertexIds[(index + 1) % loop.vertexIds.length];
          visitedHalfEdges.add(`${fromVertexId}|${toVertexId}|${wallId}`);
        });

        if (loop.levelId === levelId) {
          loops.push(loop);
        }
      }
    }
  }

  return loops;
}
