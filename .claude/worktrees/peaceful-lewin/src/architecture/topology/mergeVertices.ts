import { cloneArchitectureDocument, syncLevelEntityIds, type ArchitectureDocument } from '../domain/document.js';
import { distanceBetweenPoints } from './math.js';

export function mergeVertices(
  document: ArchitectureDocument,
  tolerance = 1e-6
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const mergedVertices: typeof next.vertices = {};
  const canonicalVertexIdByVertexId = new Map<string, string>();

  for (const [vertexId, vertex] of Object.entries(next.vertices)) {
    const canonicalVertex = Object.values(mergedVertices).find((candidate) => (
      distanceBetweenPoints([vertex.x, vertex.y], [candidate.x, candidate.y]) <= tolerance
    ));

    if (canonicalVertex) {
      canonicalVertexIdByVertexId.set(vertexId, canonicalVertex.id);
      continue;
    }

    mergedVertices[vertexId] = vertex;
    canonicalVertexIdByVertexId.set(vertexId, vertexId);
  }

  next.vertices = mergedVertices;
  next.walls = Object.fromEntries(
    Object.entries(next.walls).map(([wallId, wall]) => [
      wallId,
      {
        ...wall,
        startVertexId: canonicalVertexIdByVertexId.get(wall.startVertexId) ?? wall.startVertexId,
        endVertexId: canonicalVertexIdByVertexId.get(wall.endVertexId) ?? wall.endVertexId,
      },
    ])
  );

  return syncLevelEntityIds(next);
}
