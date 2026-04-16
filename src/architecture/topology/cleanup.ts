import { cloneArchitectureDocument, syncLevelEntityIds, type ArchitectureDocument } from '../domain/document.js';
import { cross2D, distanceBetweenPoints, dot2D } from './math.js';

function createDuplicateWallKey(startVertexId: string, endVertexId: string, levelId: string): string {
  const orderedVertexIds = [startVertexId, endVertexId].sort();

  return `${levelId}:${orderedVertexIds[0]}:${orderedVertexIds[1]}`;
}

function removeIllegalWalls(next: ArchitectureDocument, epsilon: number): void {
  const legalWalls: typeof next.walls = {};
  const legalWallOrder: string[] = [];

  for (const wallId of next.wallOrder) {
    const wall = next.walls[wallId];
    const startVertex = wall ? next.vertices[wall.startVertexId] : null;
    const endVertex = wall ? next.vertices[wall.endVertexId] : null;

    if (!wall || !startVertex || !endVertex) {
      continue;
    }

    if (distanceBetweenPoints([startVertex.x, startVertex.y], [endVertex.x, endVertex.y]) <= epsilon) {
      continue;
    }

    legalWalls[wallId] = wall;
    legalWallOrder.push(wallId);
  }

  next.walls = legalWalls;
  next.wallOrder = legalWallOrder;
}

function removeDuplicateWalls(next: ArchitectureDocument): void {
  const dedupedWalls: typeof next.walls = {};
  const dedupedWallOrder: string[] = [];
  const seenWallKeys = new Set<string>();

  for (const wallId of next.wallOrder) {
    const wall = next.walls[wallId];

    if (!wall) {
      continue;
    }

    const duplicateKey = createDuplicateWallKey(
      wall.startVertexId,
      wall.endVertexId,
      wall.levelId
    );

    if (seenWallKeys.has(duplicateKey)) {
      continue;
    }

    seenWallKeys.add(duplicateKey);
    dedupedWalls[wallId] = wall;
    dedupedWallOrder.push(wallId);
  }

  next.walls = dedupedWalls;
  next.wallOrder = dedupedWallOrder;
}

function buildVertexConnectivity(next: ArchitectureDocument): Map<string, string[]> {
  const connectivity = new Map<string, string[]>();

  for (const wallId of next.wallOrder) {
    const wall = next.walls[wallId];

    if (!wall) {
      continue;
    }

    const startWallIds = connectivity.get(wall.startVertexId) ?? [];
    if (!connectivity.has(wall.startVertexId)) {
      connectivity.set(wall.startVertexId, startWallIds);
    }
    startWallIds.push(wallId);

    const endWallIds = connectivity.get(wall.endVertexId) ?? [];
    if (!connectivity.has(wall.endVertexId)) {
      connectivity.set(wall.endVertexId, endWallIds);
    }
    endWallIds.push(wallId);
  }

  return connectivity;
}

function buildVertexDegrees(connectivity: Map<string, string[]>): Map<string, number> {
  const degrees = new Map<string, number>();

  for (const [vertexId, wallIds] of connectivity.entries()) {
    degrees.set(vertexId, wallIds.length);
  }

  return degrees;
}

function removeIsolatedVertices(
  next: ArchitectureDocument,
  connectivity: Map<string, string[]>
): void {
  next.vertices = Object.fromEntries(
    Object.entries(next.vertices).filter(([vertexId]) => connectivity.has(vertexId))
  );
}

function getWallOtherVertexId(wall: NonNullable<ArchitectureDocument['walls'][string]>, vertexId: string): string | null {
  if (wall.startVertexId === vertexId) {
    return wall.endVertexId;
  }

  if (wall.endVertexId === vertexId) {
    return wall.startVertexId;
  }

  return null;
}

function isSafeCollinearCollapseCandidate(
  next: ArchitectureDocument,
  middleVertexId: string,
  connectedWallIds: string[],
  epsilon: number
): null | {
  absorbedWallId: string;
  endVertexId: string;
  middleVertexId: string;
  startVertexId: string;
  survivingWallId: string;
} {
  if (connectedWallIds.length !== 2) {
    return null;
  }

  const [firstWallId, secondWallId] = connectedWallIds;
  const firstWall = next.walls[firstWallId];
  const secondWall = next.walls[secondWallId];
  const middleVertex = next.vertices[middleVertexId];

  if (!firstWall || !secondWall || !middleVertex) {
    return null;
  }

  if (
    firstWall.levelId !== secondWall.levelId ||
    firstWall.thickness !== secondWall.thickness ||
    firstWall.height !== secondWall.height ||
    firstWall.kind !== secondWall.kind
  ) {
    return null;
  }

  const firstOtherVertexId = getWallOtherVertexId(firstWall, middleVertexId);
  const secondOtherVertexId = getWallOtherVertexId(secondWall, middleVertexId);

  if (!firstOtherVertexId || !secondOtherVertexId || firstOtherVertexId === secondOtherVertexId) {
    return null;
  }

  const firstOtherVertex = next.vertices[firstOtherVertexId];
  const secondOtherVertex = next.vertices[secondOtherVertexId];

  if (!firstOtherVertex || !secondOtherVertex) {
    return null;
  }

  const firstVector: [number, number] = [
    firstOtherVertex.x - middleVertex.x,
    firstOtherVertex.y - middleVertex.y,
  ];
  const secondVector: [number, number] = [
    secondOtherVertex.x - middleVertex.x,
    secondOtherVertex.y - middleVertex.y,
  ];

  if (Math.abs(cross2D(firstVector, secondVector)) > epsilon) {
    return null;
  }

  if (dot2D(firstVector, secondVector) >= 0) {
    return null;
  }

  return {
    absorbedWallId: secondWallId,
    endVertexId: secondOtherVertexId,
    middleVertexId,
    startVertexId: firstOtherVertexId,
    survivingWallId: firstWallId,
  };
}

function collapseCollinearVertex(
  next: ArchitectureDocument,
  candidate: NonNullable<ReturnType<typeof isSafeCollinearCollapseCandidate>>
): void {
  const survivingWall = next.walls[candidate.survivingWallId];
  const absorbedWall = next.walls[candidate.absorbedWallId];

  if (!survivingWall || !absorbedWall) {
    return;
  }

  next.walls[candidate.survivingWallId] = {
    ...survivingWall,
    startVertexId: candidate.startVertexId,
    endVertexId: candidate.endVertexId,
  };

  delete next.walls[candidate.absorbedWallId];
  delete next.vertices[candidate.middleVertexId];
  next.wallOrder = next.wallOrder.filter((wallId) => wallId !== candidate.absorbedWallId);
}

function collapseSafeCollinearVertices(next: ArchitectureDocument, epsilon: number): void {
  while (true) {
    const connectivity = buildVertexConnectivity(next);
    const degrees = buildVertexDegrees(connectivity);
    let didCollapse = false;

    for (const [vertexId, connectedWallIds] of connectivity.entries()) {
      if (degrees.get(vertexId) !== 2) {
        continue;
      }

      const candidate = isSafeCollinearCollapseCandidate(
        next,
        vertexId,
        connectedWallIds,
        epsilon
      );

      if (!candidate) {
        continue;
      }

      collapseCollinearVertex(next, candidate);
      didCollapse = true;
      break;
    }

    if (!didCollapse) {
      return;
    }
  }
}

export function cleanupTopology(
  document: ArchitectureDocument,
  epsilon = 1e-6,
  options?: { collapseCollinear?: boolean }
): ArchitectureDocument {
  const { collapseCollinear = true } = options ?? {};
  const next = cloneArchitectureDocument(document);
  removeIllegalWalls(next, epsilon);
  removeDuplicateWalls(next);
  let connectivity = buildVertexConnectivity(next);
  removeIsolatedVertices(next, connectivity);
  if (collapseCollinear) {
    collapseSafeCollinearVertices(next, epsilon);
    connectivity = buildVertexConnectivity(next);
    removeIsolatedVertices(next, connectivity);
  }
  next.zones = {};
  next.zoneOrder = [];

  return syncLevelEntityIds(next);
}
