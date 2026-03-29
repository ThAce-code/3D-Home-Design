import type { ArchitectureDocument } from '../domain/document.js';
import { intersectSegments } from './intersections.js';
import type { Point2 } from './math.js';

interface AdjacencyEdge {
  wallId: string;
  otherVertexId: string;
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

      if (hit) {
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
    });
    adjacency.set(wall.startVertexId, startEdges);

    const endEdges = adjacency.get(wall.endVertexId) ?? [];
    endEdges.push({
      wallId,
      otherVertexId: wall.startVertexId,
    });
    adjacency.set(wall.endVertexId, endEdges);
  }

  return adjacency;
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

function traceClosedLoop(
  document: ArchitectureDocument,
  levelId: string,
  componentVertexIds: string[],
  adjacency: Map<string, AdjacencyEdge[]>,
  epsilon: number
): ClosedLoop | null {
  if (componentVertexIds.length < 3) {
    return null;
  }

  const degreesAreClosed = componentVertexIds.every((vertexId) => {
    const degree = adjacency.get(vertexId)?.length ?? 0;

    return degree === 2;
  });

  if (!degreesAreClosed) {
    return null;
  }

  const sortedVertexIds = [...componentVertexIds].sort((left, right) => (
    compareVertexIds(left, right, document)
  ));
  const startVertexId = sortedVertexIds[0];
  const loopVertexIds: string[] = [];
  const loopWallIds: string[] = [];
  let previousVertexId: string | null = null;
  let currentVertexId = startVertexId;

  while (true) {
    loopVertexIds.push(currentVertexId);

    const nextEdge = (adjacency.get(currentVertexId) ?? []).find((edge) => (
      edge.otherVertexId !== previousVertexId
    ));

    if (!nextEdge) {
      return null;
    }

    loopWallIds.push(nextEdge.wallId);
    previousVertexId = currentVertexId;
    currentVertexId = nextEdge.otherVertexId;

    if (currentVertexId === startVertexId) {
      break;
    }

    if (loopVertexIds.includes(currentVertexId) || loopVertexIds.length > componentVertexIds.length) {
      return null;
    }
  }

  if (loopWallIds.length !== componentVertexIds.length) {
    return null;
  }

  const points = loopVertexIds.map((vertexId) => getPoint(document, vertexId));
  const signedArea = getSignedArea(points);

  if (Math.abs(signedArea) <= epsilon || hasSelfIntersection(points, epsilon)) {
    return null;
  }

  if (signedArea < 0) {
    return {
      levelId,
      vertexIds: [...loopVertexIds].reverse(),
      wallIds: [...loopWallIds].reverse(),
    };
  }

  return {
    levelId,
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
    const adjacency = buildAdjacency(document, levelId);
    const visitedVertexIds = new Set<string>();

    for (const vertexId of adjacency.keys()) {
      if (visitedVertexIds.has(vertexId)) {
        continue;
      }

      const componentVertexIds = collectConnectedVertexIds(vertexId, adjacency);
      componentVertexIds.forEach((id) => visitedVertexIds.add(id));

      const loop = traceClosedLoop(
        document,
        levelId,
        componentVertexIds,
        adjacency,
        epsilon
      );

      if (loop) {
        loops.push(loop);
      }
    }
  }

  return loops;
}
