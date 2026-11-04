import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import { clampOpeningT, createOpeningDefaults } from '../domain/opening.js';
import type { ArchitectureCommand } from './commands.js';
import { applyDrawWall, repairTopology } from '../topology/repair.js';
import type { Point2 } from '../topology/math.js';

const REPAIR_EPSILON = 1e-6;

function pruneOrphanOpenings(document: ArchitectureDocument): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  next.openingOrder = next.openingOrder.filter((openingId) => {
    const opening = next.openings[openingId];
    if (!opening || !next.walls[opening.wallId]) {
      delete next.openings[openingId];
      return false;
    }
    return true;
  });
  return next;
}

function removeWall(document: ArchitectureDocument, wallId: string): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);

  delete next.walls[wallId];
  next.wallOrder = next.wallOrder.filter((existingWallId) => existingWallId !== wallId);

  return pruneOrphanOpenings(repairTopology(syncLevelEntityIds(next)));
}

function createBoundaryEdgeKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function removeSelection(
  document: ArchitectureDocument,
  selection: Extract<ArchitectureCommand, { type: 'DELETE_SELECTION' }>,
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const wallIds = new Set(selection.wallIds);
  const vertexIds = new Set(selection.vertexIds);
  const boundaryEdges = new Set<string>();

  // Resolve every selected zone against the original graph. Rebuilding after
  // each deletion could merge adjacent zones and lose the remaining targets.
  for (const zoneId of selection.zoneIds) {
    const zone = document.zones[zoneId];
    if (!zone) continue;
    for (let index = 0; index < zone.boundaryVertexIds.length; index += 1) {
      const a = zone.boundaryVertexIds[index];
      const b = zone.boundaryVertexIds[(index + 1) % zone.boundaryVertexIds.length];
      if (a && b) boundaryEdges.add(createBoundaryEdgeKey(a, b));
    }
    delete next.zones[zoneId];
  }

  for (const wall of Object.values(document.walls)) {
    if (vertexIds.has(wall.startVertexId) || vertexIds.has(wall.endVertexId)
      || boundaryEdges.has(createBoundaryEdgeKey(wall.startVertexId, wall.endVertexId))) {
      wallIds.add(wall.id);
    }
  }
  for (const wallId of wallIds) delete next.walls[wallId];
  for (const vertexId of vertexIds) delete next.vertices[vertexId];
  for (const openingId of selection.openingIds ?? []) {
    delete next.openings[openingId];
  }
  next.wallOrder = next.wallOrder.filter((wallId) => Boolean(next.walls[wallId]));
  next.zoneOrder = next.zoneOrder.filter((zoneId) => Boolean(next.zones[zoneId]));
  next.openingOrder = next.openingOrder.filter((openingId) => Boolean(next.openings[openingId]));

  return pruneOrphanOpenings(repairTopology(syncLevelEntityIds(next)));
}

function removeZone(document: ArchitectureDocument, zoneId: string): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const zone = next.zones[zoneId];

  if (!zone) {
    return next;
  }

  const boundaryEdges = new Set<string>();
  for (let index = 0; index < zone.boundaryVertexIds.length; index += 1) {
    const current = zone.boundaryVertexIds[index];
    const nextIndex = (index + 1) % zone.boundaryVertexIds.length;
    const following = zone.boundaryVertexIds[nextIndex];

    if (current && following) {
      boundaryEdges.add(createBoundaryEdgeKey(current, following));
    }
  }

  for (const wallId of next.wallOrder) {
    const wall = next.walls[wallId];

    if (!wall) {
      continue;
    }

    if (boundaryEdges.has(createBoundaryEdgeKey(wall.startVertexId, wall.endVertexId))) {
      delete next.walls[wallId];
    }
  }

  delete next.zones[zoneId];
  next.wallOrder = next.wallOrder.filter((wallId) => Boolean(next.walls[wallId]));
  next.zoneOrder = next.zoneOrder.filter((existingZoneId) => existingZoneId !== zoneId);

  return pruneOrphanOpenings(repairTopology(syncLevelEntityIds(next)));
}

function moveVertex(
  document: ArchitectureDocument,
  vertexId: string,
  to: [number, number]
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const vertex = next.vertices[vertexId];

  if (!vertex) {
    return next;
  }

  next.vertices[vertexId] = {
    ...vertex,
    x: to[0],
    y: to[1],
  };

  return repairTopology(syncLevelEntityIds(next));
}

function splitWall(
  document: ArchitectureDocument,
  wallId: string,
  splitPoint: Point2,
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const wall = next.walls[wallId];

  if (!wall) {
    return next;
  }

  const midpointVertexId = crypto.randomUUID();
  const newWallId = crypto.randomUUID();

  next.vertices[midpointVertexId] = {
    id: midpointVertexId,
    x: splitPoint[0],
    y: splitPoint[1],
  };

  next.walls[wallId] = {
    ...wall,
    endVertexId: midpointVertexId,
  };

  next.walls[newWallId] = {
    ...wall,
    id: newWallId,
    startVertexId: midpointVertexId,
  };

  const insertIndex = next.wallOrder.indexOf(wallId);
  if (insertIndex === -1) {
    next.wallOrder.push(newWallId);
  } else {
    next.wallOrder.splice(insertIndex + 1, 0, newWallId);
  }

  return repairTopology(syncLevelEntityIds(next), REPAIR_EPSILON, {
    collapseCollinear: false,
  });
}

function deleteVertex(document: ArchitectureDocument, vertexId: string): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const connectedWallIds = next.wallOrder.filter((wallId) => {
    const wall = next.walls[wallId];

    return wall?.startVertexId === vertexId || wall?.endVertexId === vertexId;
  });

  for (const wallId of connectedWallIds) {
    delete next.walls[wallId];
  }

  delete next.vertices[vertexId];
  next.wallOrder = next.wallOrder.filter((wallId) => !connectedWallIds.includes(wallId));

  return pruneOrphanOpenings(repairTopology(syncLevelEntityIds(next)));
}

function setWallProps(
  document: ArchitectureDocument,
  wallId: string,
  patch: Extract<ArchitectureCommand, { type: 'SET_WALL_PROPS' }>['patch']
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const wall = next.walls[wallId];

  if (!wall) {
    return next;
  }

  next.walls[wallId] = {
    ...wall,
    ...patch,
  };

  // V1 zone IDs are still rebuild-scoped. Pure wall property edits avoid
  // unnecessary derived churn until stable zone identity lands before Task 6.
  return syncLevelEntityIds(next);
}

function setZoneProps(
  document: ArchitectureDocument,
  zoneId: string,
  patch: Extract<ArchitectureCommand, { type: 'SET_ZONE_PROPS' }>['patch']
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const zone = next.zones[zoneId];

  if (!zone) {
    return next;
  }

  next.zones[zoneId] = {
    ...zone,
    ...patch,
  };

  return syncLevelEntityIds(next);
}

function addOpening(
  document: ArchitectureDocument,
  command: Extract<ArchitectureCommand, { type: 'ADD_OPENING' }>,
): ArchitectureDocument {
  if (!document.walls[command.wallId]) {
    return document;
  }

  const next = cloneArchitectureDocument(document);
  const defaults = createOpeningDefaults(command.kind);
  const openingId = crypto.randomUUID();
  next.openings[openingId] = {
    id: openingId,
    wallId: command.wallId,
    kind: command.kind,
    t: clampOpeningT(command.t),
    width: command.width ?? defaults.width,
    height: command.height ?? defaults.height,
    sillHeight: command.sillHeight ?? defaults.sillHeight,
  };
  next.openingOrder.push(openingId);
  return next;
}

function setOpeningProps(
  document: ArchitectureDocument,
  openingId: string,
  patch: Extract<ArchitectureCommand, { type: 'SET_OPENING_PROPS' }>['patch'],
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const opening = next.openings[openingId];
  if (!opening) {
    return next;
  }

  next.openings[openingId] = {
    ...opening,
    ...patch,
    t: patch.t === undefined ? opening.t : clampOpeningT(patch.t),
  };
  return next;
}

function removeOpening(document: ArchitectureDocument, openingId: string): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  delete next.openings[openingId];
  next.openingOrder = next.openingOrder.filter((id) => id !== openingId);
  return next;
}

export function reduceArchitectureCommand(
  document: ArchitectureDocument,
  command: ArchitectureCommand
): ArchitectureDocument {
  switch (command.type) {
    case 'DRAW_WALL':
      return applyDrawWall(document, command.start, command.end);
    case 'MOVE_VERTEX':
      return moveVertex(document, command.vertexId, command.to);
    case 'SPLIT_WALL':
      return splitWall(document, command.wallId, command.splitPoint);
    case 'DELETE_WALL':
      return removeWall(document, command.wallId);
    case 'DELETE_ZONE':
      return removeZone(document, command.zoneId);
    case 'DELETE_VERTEX':
      return deleteVertex(document, command.vertexId);
    case 'DELETE_SELECTION':
      return removeSelection(document, command);
    case 'SET_WALL_PROPS':
      return setWallProps(document, command.wallId, command.patch);
    case 'SET_ZONE_PROPS':
      return setZoneProps(document, command.zoneId, command.patch);
    case 'ADD_OPENING':
      return addOpening(document, command);
    case 'SET_OPENING_PROPS':
      return setOpeningProps(document, command.openingId, command.patch);
    case 'DELETE_OPENING':
      return removeOpening(document, command.openingId);
    default: {
      const exhaustiveCheck: never = command;
      return exhaustiveCheck;
    }
  }
}
