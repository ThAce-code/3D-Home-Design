import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';

export interface FloorPolygon {
  zoneId: string;
  levelId: string;
  points: Point2[];
}

export function buildFloorPolygons(document: ArchitectureDocument): FloorPolygon[] {
  return document.zoneOrder.flatMap((zoneId) => {
    const zone = document.zones[zoneId];

    if (!zone) {
      return [];
    }

    return [{
      zoneId,
      levelId: zone.levelId,
      points: zone.boundaryVertexIds.flatMap((vertexId) => {
        const vertex = document.vertices[vertexId];

        return vertex ? [[vertex.x, vertex.y] as Point2] : [];
      }),
    }];
  });
}
