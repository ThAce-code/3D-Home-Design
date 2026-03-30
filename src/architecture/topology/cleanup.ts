import { cloneArchitectureDocument, syncLevelEntityIds, type ArchitectureDocument } from '../domain/document.js';
import { distanceBetweenPoints } from './math.js';

function createDuplicateWallKey(startVertexId: string, endVertexId: string, levelId: string): string {
  const orderedVertexIds = [startVertexId, endVertexId].sort();

  return `${levelId}:${orderedVertexIds[0]}:${orderedVertexIds[1]}`;
}

export function cleanupTopology(
  document: ArchitectureDocument,
  epsilon = 1e-6
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const dedupedWalls: typeof next.walls = {};
  const dedupedWallOrder: string[] = [];
  const seenWallKeys = new Set<string>();

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

  const referencedVertexIds = new Set<string>();
  for (const wall of Object.values(dedupedWalls)) {
    referencedVertexIds.add(wall.startVertexId);
    referencedVertexIds.add(wall.endVertexId);
  }

  next.walls = dedupedWalls;
  next.wallOrder = dedupedWallOrder;
  next.vertices = Object.fromEntries(
    Object.entries(next.vertices).filter(([vertexId]) => referencedVertexIds.has(vertexId))
  );
  next.zones = {};
  next.zoneOrder = [];

  return syncLevelEntityIds(next);
}
