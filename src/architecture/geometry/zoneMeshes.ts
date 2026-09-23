import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import { buildFloorPolygons } from './floorPolygons.js';

export interface ZoneMeshDescriptor {
  zoneId: string;
  levelId: string;
  shapePoints: Point2[];
  position: [number, number, number];
  rotation: [number, number, number];
}

export function buildZoneMeshDescriptors(document: ArchitectureDocument): ZoneMeshDescriptor[] {
  return buildFloorPolygons(document).map((polygon) => ({
    zoneId: polygon.zoneId,
    levelId: polygon.levelId,
    // ShapeGeometry lives in XY before the scene rotates it into XZ, so the
    // model-space Y axis must be mirrored to keep the mesh aligned with walls.
    shapePoints: polygon.points.map(([x, y]) => [x, -y] as Point2),
    position: [0, 0.01, 0],
    rotation: [-Math.PI / 2, 0, 0],
  }));
}
