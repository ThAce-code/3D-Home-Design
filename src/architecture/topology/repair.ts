import {
  cloneArchitectureDocument,
  getPrimaryLevelId,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import { cleanupTopology } from './cleanup.js';
import { mergeVertices } from './mergeVertices.js';
import { snapPointToVertices } from './snap.js';
import { splitIntersectingWalls } from './splitWalls.js';
import type { Point2 } from './math.js';
import { rebuildZones } from './zones.js';

const DEFAULT_SNAP_TOLERANCE = 0.1;
const DEFAULT_REPAIR_EPSILON = 1e-6;

function ensureVertexIdForPoint(
  document: ArchitectureDocument,
  point: Point2,
  snapTolerance: number
): string {
  const snapResult = snapPointToVertices(
    point,
    Object.values(document.vertices),
    snapTolerance
  );

  if (snapResult.vertexId) {
    return snapResult.vertexId;
  }

  const vertexId = crypto.randomUUID();
  document.vertices[vertexId] = {
    id: vertexId,
    x: point[0],
    y: point[1],
  };

  return vertexId;
}

export function applyDrawWall(
  document: ArchitectureDocument,
  start: Point2,
  end: Point2,
  snapTolerance = DEFAULT_SNAP_TOLERANCE
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const levelId = getPrimaryLevelId(next);
  const level = next.levels[levelId];
  const startVertexId = ensureVertexIdForPoint(next, start, snapTolerance);
  const endVertexId = ensureVertexIdForPoint(next, end, snapTolerance);
  const wallId = crypto.randomUUID();

  next.walls[wallId] = {
    id: wallId,
    levelId,
    startVertexId,
    endVertexId,
    thickness: level.defaultWallThickness,
    height: level.defaultWallHeight,
    kind: 'structural',
  };
  next.wallOrder.push(wallId);

  return repairTopology(syncLevelEntityIds(next), DEFAULT_REPAIR_EPSILON, {
    collapseCollinear: false,
  });
}

export function repairTopology(
  document: ArchitectureDocument,
  epsilon = DEFAULT_REPAIR_EPSILON,
  options?: { collapseCollinear?: boolean }
): ArchitectureDocument {
  const splitDocument = splitIntersectingWalls(document, epsilon);
  const mergedDocument = mergeVertices(splitDocument, epsilon);
  const cleanedDocument = cleanupTopology(mergedDocument, epsilon, {
    collapseCollinear: options?.collapseCollinear,
  });

  return rebuildZones(cleanedDocument, epsilon);
}
