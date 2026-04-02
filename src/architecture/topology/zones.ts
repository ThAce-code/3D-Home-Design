import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { Zone } from '../domain/zone.js';
import { cross2D, dot2D, subtractPoints, type Point2 } from './math.js';
import { findClosedLoops } from './loops.js';

export const MIN_VALID_ZONE_AREA = 0.25;

// V1 only accepts disconnected simple loops as zone candidates. Shared-wall
// graphs and full face extraction remain explicitly out of scope for now.
function rotateBoundaryToSmallestVertexId(boundaryVertexIds: string[]): string[] {
  if (boundaryVertexIds.length <= 1) {
    return [...boundaryVertexIds];
  }

  const smallestVertexId = [...boundaryVertexIds].sort()[0];
  const startIndex = boundaryVertexIds.indexOf(smallestVertexId);

  if (startIndex === -1) {
    return [...boundaryVertexIds];
  }

  return [
    ...boundaryVertexIds.slice(startIndex),
    ...boundaryVertexIds.slice(0, startIndex),
  ];
}

export function canonicalizeBoundaryVertexIds(boundaryVertexIds: string[]): string[] {
  const forward = rotateBoundaryToSmallestVertexId(boundaryVertexIds);
  const reverse = rotateBoundaryToSmallestVertexId([...boundaryVertexIds].reverse());
  const forwardSignature = forward.join('|');
  const reverseSignature = reverse.join('|');

  return forwardSignature <= reverseSignature ? forward : reverse;
}

function getVertexPoint(
  document: ArchitectureDocument,
  vertexId: string
): Point2 | null {
  const vertex = document.vertices[vertexId];

  if (!vertex) {
    return null;
  }

  return [vertex.x, vertex.y];
}

function isRedundantBoundaryVertex(
  document: ArchitectureDocument,
  previousVertexId: string,
  currentVertexId: string,
  nextVertexId: string,
  epsilon: number
): boolean {
  const previousPoint = getVertexPoint(document, previousVertexId);
  const currentPoint = getVertexPoint(document, currentVertexId);
  const nextPoint = getVertexPoint(document, nextVertexId);

  if (!previousPoint || !currentPoint || !nextPoint) {
    return false;
  }

  const previousToNext = subtractPoints(nextPoint, previousPoint);
  const previousToCurrent = subtractPoints(currentPoint, previousPoint);
  const currentToNext = subtractPoints(currentPoint, nextPoint);

  if (Math.abs(cross2D(previousToNext, previousToCurrent)) > epsilon) {
    return false;
  }

  return dot2D(previousToCurrent, currentToNext) <= epsilon;
}

function simplifyBoundaryVertexIds(
  document: ArchitectureDocument,
  boundaryVertexIds: string[],
  epsilon: number
): string[] {
  if (boundaryVertexIds.length <= 3) {
    return [...boundaryVertexIds];
  }

  const simplified = [...boundaryVertexIds];
  let changed = true;

  while (changed && simplified.length > 3) {
    changed = false;

    for (let index = 0; index < simplified.length; index += 1) {
      const previousVertexId = simplified[(index - 1 + simplified.length) % simplified.length];
      const currentVertexId = simplified[index];
      const nextVertexId = simplified[(index + 1) % simplified.length];

      if (!previousVertexId || !currentVertexId || !nextVertexId) {
        continue;
      }

      if (!isRedundantBoundaryVertex(
        document,
        previousVertexId,
        currentVertexId,
        nextVertexId,
        epsilon
      )) {
        continue;
      }

      simplified.splice(index, 1);
      changed = true;
      break;
    }
  }

  return simplified;
}

function createBoundarySignature(
  document: ArchitectureDocument,
  boundaryVertexIds: string[],
  epsilon: number
): string {
  return canonicalizeBoundaryVertexIds(
    simplifyBoundaryVertexIds(document, boundaryVertexIds, epsilon)
  ).join('|');
}

function computeBoundaryArea(
  document: ArchitectureDocument,
  boundaryVertexIds: string[]
): number {
  if (boundaryVertexIds.length < 3) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < boundaryVertexIds.length; index += 1) {
    const currentVertex = document.vertices[boundaryVertexIds[index]];
    const nextVertex = document.vertices[boundaryVertexIds[(index + 1) % boundaryVertexIds.length]];

    if (!currentVertex || !nextVertex) {
      return 0;
    }

    area += (currentVertex.x * nextVertex.y) - (nextVertex.x * currentVertex.y);
  }

  return Math.abs(area) / 2;
}

export function rebuildZones(
  document: ArchitectureDocument,
  epsilon = 1e-6
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const loops = findClosedLoops(next, epsilon);
  const previousZoneIdBySignature = new Map<string, string>();
  const previousZoneById = new Map<string, Zone>();
  const usedZoneIds = new Set<string>();

  for (const zoneId of document.zoneOrder) {
    const zone = document.zones[zoneId];

    if (!zone) {
      continue;
    }

    previousZoneIdBySignature.set(
      createBoundarySignature(document, zone.boundaryVertexIds, epsilon),
      zoneId
    );
    previousZoneById.set(zoneId, zone);
  }

  const loopsWithCanonicalBoundaries = loops.map((loop) => {
    const canonicalBoundaryVertexIds = canonicalizeBoundaryVertexIds(loop.vertexIds);

    return {
      ...loop,
      canonicalBoundaryVertexIds,
      area: computeBoundaryArea(next, canonicalBoundaryVertexIds),
      signature: createBoundarySignature(next, canonicalBoundaryVertexIds, epsilon),
    };
  }).filter((loop) => loop.area >= MIN_VALID_ZONE_AREA)
    .sort((left, right) => left.signature.localeCompare(right.signature));

  next.zones = {};
  next.zoneOrder = [];

  for (const loop of loopsWithCanonicalBoundaries) {
    const matchedZoneId = previousZoneIdBySignature.get(loop.signature);
    const reusableZoneId = matchedZoneId && !usedZoneIds.has(matchedZoneId)
      ? matchedZoneId
      : null;
    const zoneId = reusableZoneId ?? crypto.randomUUID();
    const previousZone = reusableZoneId
      ? previousZoneById.get(reusableZoneId)
      : null;

    usedZoneIds.add(zoneId);

    next.zones[zoneId] = {
      id: zoneId,
      levelId: loop.levelId,
      boundaryVertexIds: loop.canonicalBoundaryVertexIds,
      kind: previousZone?.kind ?? 'unknown',
      name: previousZone?.name ?? null,
    };
    next.zoneOrder.push(zoneId);
  }

  return syncLevelEntityIds(next);
}
