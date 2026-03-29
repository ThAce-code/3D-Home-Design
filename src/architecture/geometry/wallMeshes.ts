import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';

export interface WallMeshDescriptor {
  wallId: string;
  levelId: string;
  center: Point2;
  length: number;
  thickness: number;
  height: number;
  angle: number;
  start: Point2;
  end: Point2;
}

export function buildWallMeshDescriptors(document: ArchitectureDocument): WallMeshDescriptor[] {
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

    return [{
      wallId,
      levelId: wall.levelId,
      center: [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
      ],
      length: Math.hypot(dx, dy),
      thickness: wall.thickness,
      height: wall.height,
      angle: Math.atan2(dy, dx),
      start,
      end,
    }];
  });
}
