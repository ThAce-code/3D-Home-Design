import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';

export interface ZoneAreaDescriptor {
  zoneId: string;
  area: number;
  centroid: Point2;
  name: string | null;
  kind: string;
}

export function computeZoneSignedArea(points: Point2[]): number {
  let signedArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) {
      return 0;
    }
    signedArea += (current[0] * next[1]) - (next[0] * current[1]);
  }
  return signedArea / 2;
}

export function getZoneBoundaryPoints(
  document: ArchitectureDocument,
  zoneId: string,
): Point2[] | null {
  const zone = document.zones[zoneId];
  if (!zone || zone.boundaryVertexIds.length < 3) {
    return null;
  }

  const points: Point2[] = [];
  for (const vertexId of zone.boundaryVertexIds) {
    const vertex = document.vertices[vertexId];
    if (!vertex) {
      return null;
    }
    points.push([vertex.x, vertex.y]);
  }
  return points;
}

export function getZoneArea(document: ArchitectureDocument, zoneId: string): number | null {
  const points = getZoneBoundaryPoints(document, zoneId);
  if (!points) {
    return null;
  }
  return Math.abs(computeZoneSignedArea(points));
}

export function getZoneCentroid(points: Point2[]): Point2 {
  let area = computeZoneSignedArea(points);
  if (Math.abs(area) <= 1e-12) {
    const sumX = points.reduce((sum, point) => sum + point[0], 0);
    const sumY = points.reduce((sum, point) => sum + point[1], 0);
    return [sumX / points.length, sumY / points.length];
  }

  let cx = 0;
  let cy = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    const cross = (current[0] * next[1]) - (next[0] * current[1]);
    cx += (current[0] + next[0]) * cross;
    cy += (current[1] + next[1]) * cross;
  }

  area *= 6;
  return [cx / area, cy / area];
}

export function buildZoneAreaDescriptors(document: ArchitectureDocument): ZoneAreaDescriptor[] {
  return document.zoneOrder.flatMap((zoneId) => {
    const zone = document.zones[zoneId];
    const points = getZoneBoundaryPoints(document, zoneId);
    if (!zone || !points) {
      return [];
    }

    return [{
      zoneId,
      area: Math.abs(computeZoneSignedArea(points)),
      centroid: getZoneCentroid(points),
      name: zone.name,
      kind: zone.kind,
    }];
  });
}
