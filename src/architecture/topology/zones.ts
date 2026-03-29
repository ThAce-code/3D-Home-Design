import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { Zone } from '../domain/zone.js';
import { findClosedLoops } from './loops.js';

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

function createBoundarySignature(boundaryVertexIds: string[]): string {
  return canonicalizeBoundaryVertexIds(boundaryVertexIds).join('|');
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
      createBoundarySignature(zone.boundaryVertexIds),
      zoneId
    );
    previousZoneById.set(zoneId, zone);
  }

  const loopsWithCanonicalBoundaries = loops.map((loop) => {
    const canonicalBoundaryVertexIds = canonicalizeBoundaryVertexIds(loop.vertexIds);

    return {
      ...loop,
      canonicalBoundaryVertexIds,
      signature: canonicalBoundaryVertexIds.join('|'),
    };
  }).sort((left, right) => left.signature.localeCompare(right.signature));

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
