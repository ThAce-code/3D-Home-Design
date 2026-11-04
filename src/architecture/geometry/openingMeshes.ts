import type { ArchitectureDocument } from '../domain/document.js';
import type { Opening } from '../domain/opening.js';
import type { Point2 } from '../topology/math.js';

export interface OpeningMeshDescriptor {
  openingId: string;
  wallId: string;
  kind: Opening['kind'];
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  depth: number;
}

export function buildOpeningMeshDescriptors(document: ArchitectureDocument): OpeningMeshDescriptor[] {
  return (document.openingOrder ?? []).flatMap((openingId) => {
    const opening = document.openings?.[openingId];
    if (!opening) {
      return [];
    }

    const wall = document.walls[opening.wallId];
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
    const length = Math.hypot(dx, dy);
    if (length <= 1e-9) {
      return [];
    }

    const t = opening.t;
    const centerX = start[0] + dx * t;
    const centerZ = start[1] + dy * t;
    const centerY = opening.sillHeight + opening.height / 2;

    return [{
      openingId,
      wallId: opening.wallId,
      kind: opening.kind,
      position: [centerX, centerY, centerZ],
      rotationY: -Math.atan2(dy, dx),
      width: opening.width,
      height: opening.height,
      depth: Math.max(wall.thickness * 1.05, 0.08),
    }];
  });
}
