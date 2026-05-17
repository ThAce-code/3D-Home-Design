import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import type { ArchitectureSelection } from './tools.js';

export type EditHandleKind =
  | 'vertex-endpoint'
  | 'wall-midpoint'
  | 'zone-center';

export interface EditHandle {
  id: string;
  kind: EditHandleKind;
  position: Point2;
  entityId: string;
  entityType: 'vertex' | 'wall' | 'zone';
}

function addVertexHandle(
  document: ArchitectureDocument,
  handles: EditHandle[],
  addedVertexIds: Set<string>,
  vertexId: string,
) {
  if (addedVertexIds.has(vertexId)) {
    return;
  }

  const vertex = document.vertices[vertexId];
  if (!vertex) {
    return;
  }

  addedVertexIds.add(vertexId);
  handles.push({
    id: `handle:vertex:${vertexId}`,
    kind: 'vertex-endpoint',
    position: [vertex.x, vertex.y],
    entityId: vertexId,
    entityType: 'vertex',
  });
}

export function resolveEditHandles(
  document: ArchitectureDocument,
  selection: ArchitectureSelection,
): EditHandle[] {
  const handles: EditHandle[] = [];
  const addedVertexIds = new Set<string>();

  for (const wallId of selection.wallIds) {
    const wall = document.walls[wallId];
    if (!wall) {
      continue;
    }

    addVertexHandle(document, handles, addedVertexIds, wall.startVertexId);
    addVertexHandle(document, handles, addedVertexIds, wall.endVertexId);

    const startVertex = document.vertices[wall.startVertexId];
    const endVertex = document.vertices[wall.endVertexId];
    if (startVertex && endVertex) {
      handles.push({
        id: `handle:midpoint:${wallId}`,
        kind: 'wall-midpoint',
        position: [
          (startVertex.x + endVertex.x) / 2,
          (startVertex.y + endVertex.y) / 2,
        ],
        entityId: wallId,
        entityType: 'wall',
      });
    }
  }

  for (const vertexId of selection.vertexIds) {
    addVertexHandle(document, handles, addedVertexIds, vertexId);
  }

  return handles;
}
