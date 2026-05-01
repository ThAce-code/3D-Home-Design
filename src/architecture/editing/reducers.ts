import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { ArchitectureCommand } from './commands.js';
import { applyDrawWall, repairTopology } from '../topology/repair.js';

function removeWall(document: ArchitectureDocument, wallId: string): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);

  delete next.walls[wallId];
  next.wallOrder = next.wallOrder.filter((existingWallId) => existingWallId !== wallId);

  return repairTopology(syncLevelEntityIds(next));
}

function createBoundaryEdgeKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
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

  return repairTopology(syncLevelEntityIds(next));
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

  return repairTopology(syncLevelEntityIds(next));
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

export function reduceArchitectureCommand(
  document: ArchitectureDocument,
  command: ArchitectureCommand
): ArchitectureDocument {
  switch (command.type) {
    case 'DRAW_WALL':
      return applyDrawWall(document, command.start, command.end);
    case 'MOVE_VERTEX':
      return moveVertex(document, command.vertexId, command.to);
    case 'DELETE_WALL':
      return removeWall(document, command.wallId);
    case 'DELETE_ZONE':
      return removeZone(document, command.zoneId);
    case 'DELETE_VERTEX':
      return deleteVertex(document, command.vertexId);
    case 'SET_WALL_PROPS':
      return setWallProps(document, command.wallId, command.patch);
    case 'SET_ZONE_PROPS':
      return setZoneProps(document, command.zoneId, command.patch);
    default: {
      const exhaustiveCheck: never = command;
      return exhaustiveCheck;
    }
  }
}
