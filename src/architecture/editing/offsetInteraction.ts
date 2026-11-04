import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import { distanceBetweenPoints, type Point2 } from '../topology/math.js';
import { repairTopology } from '../topology/repair.js';
import { createEmptySelection, type ArchitectureViewportState, type WallDragState } from './tools.js';
import type { ArchitectureInteractionCommand } from './interaction.js';

const REPAIR_EPSILON = 1e-6;

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function getWallNormal(start: Point2, end: Point2): Point2 | null {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  if (length <= 1e-9) {
    return null;
  }

  return [normalizeZero(-dy / length), normalizeZero(dx / length)];
}

export function projectOffsetOntoNormal(rawOffset: Point2, normal: Point2): Point2 {
  const distance = rawOffset[0] * normal[0] + rawOffset[1] * normal[1];

  return [normalizeZero(normal[0] * distance), normalizeZero(normal[1] * distance)];
}

export function getOffsetDistance(wallDrag: WallDragState): number {
  const normal = getWallNormal(wallDrag.startVertexOrigin, wallDrag.endVertexOrigin);
  if (!normal) {
    return 0;
  }

  return wallDrag.currentOffset[0] * normal[0] + wallDrag.currentOffset[1] * normal[1];
}

export function resolveOffsetDragSnap(args: {
  distance: number;
  viewport: ArchitectureViewportState;
}): number {
  if (!args.viewport.snapEnabled || args.viewport.gridSize <= 0) {
    return args.distance;
  }

  const snapped = Math.round(args.distance / args.viewport.gridSize) * args.viewport.gridSize;
  return Math.abs(args.distance - snapped) <= args.viewport.snapTolerance
    ? snapped
    : args.distance;
}

export function createOffsetDragState(args: {
  document: ArchitectureDocument;
  wallId: string;
  grabPoint: Point2;
}): WallDragState | null {
  const wall = args.document.walls[args.wallId];
  if (!wall) {
    return null;
  }

  const startVertex = args.document.vertices[wall.startVertexId];
  const endVertex = args.document.vertices[wall.endVertexId];
  if (!startVertex || !endVertex) {
    return null;
  }

  const startVertexOrigin: Point2 = [startVertex.x, startVertex.y];
  const endVertexOrigin: Point2 = [endVertex.x, endVertex.y];
  const midpoint: Point2 = [
    (startVertexOrigin[0] + endVertexOrigin[0]) / 2,
    (startVertexOrigin[1] + endVertexOrigin[1]) / 2,
  ];

  return {
    wallId: args.wallId,
    startVertexId: wall.startVertexId,
    endVertexId: wall.endVertexId,
    startVertexOrigin,
    endVertexOrigin,
    grabOffset: [
      args.grabPoint[0] - midpoint[0],
      args.grabPoint[1] - midpoint[1],
    ],
    currentOffset: [0, 0],
    numericEntryEnabled: false,
    mode: 'offset',
  };
}

export function getOffsetDragOffsetForPoint(args: {
  wallDrag: WallDragState;
  currentPoint: Point2;
}): Point2 {
  const normal = getWallNormal(args.wallDrag.startVertexOrigin, args.wallDrag.endVertexOrigin);
  if (!normal) {
    return [0, 0];
  }

  const originMidpoint: Point2 = [
    (args.wallDrag.startVertexOrigin[0] + args.wallDrag.endVertexOrigin[0]) / 2,
    (args.wallDrag.startVertexOrigin[1] + args.wallDrag.endVertexOrigin[1]) / 2,
  ];
  const targetMidpoint: Point2 = [
    args.currentPoint[0] - args.wallDrag.grabOffset[0],
    args.currentPoint[1] - args.wallDrag.grabOffset[1],
  ];
  const rawOffset: Point2 = [
    targetMidpoint[0] - originMidpoint[0],
    targetMidpoint[1] - originMidpoint[1],
  ];

  return projectOffsetOntoNormal(rawOffset, normal);
}

export function offsetWallByDistance(
  document: ArchitectureDocument,
  wallId: string,
  distance: number,
): ArchitectureDocument | null {
  if (!Number.isFinite(distance) || Math.abs(distance) <= 1e-12) {
    return null;
  }

  const wall = document.walls[wallId];
  if (!wall) {
    return null;
  }

  const startVertex = document.vertices[wall.startVertexId];
  const endVertex = document.vertices[wall.endVertexId];
  if (!startVertex || !endVertex) {
    return null;
  }

  const start: Point2 = [startVertex.x, startVertex.y];
  const end: Point2 = [endVertex.x, endVertex.y];
  const normal = getWallNormal(start, end);
  if (!normal) {
    return null;
  }

  const next = cloneArchitectureDocument(document);
  next.vertices[wall.startVertexId] = {
    ...startVertex,
    x: start[0] + normal[0] * distance,
    y: start[1] + normal[1] * distance,
  };
  next.vertices[wall.endVertexId] = {
    ...endVertex,
    x: end[0] + normal[0] * distance,
    y: end[1] + normal[1] * distance,
  };

  return repairTopology(syncLevelEntityIds(next), REPAIR_EPSILON);
}

export function getOffsetDragCommitEffects(args: {
  document: ArchitectureDocument;
  wallDrag: WallDragState;
}): ArchitectureInteractionCommand[] {
  const distance = getOffsetDistance(args.wallDrag);
  const nextDocument = offsetWallByDistance(args.document, args.wallDrag.wallId, distance);

  if (!nextDocument) {
    return [{ type: 'commit-wall-drag' }];
  }

  const survivingWallId = nextDocument.walls[args.wallDrag.wallId]
    ? args.wallDrag.wallId
    : findNearestWallId(nextDocument, args.wallDrag);

  return [
    {
      type: 'replace-document',
      document: nextDocument,
    },
    {
      type: 'commit-wall-drag',
    },
    {
      type: 'set-selection',
      selection: {
        ...createEmptySelection(),
        wallIds: survivingWallId ? [survivingWallId] : [],
      },
    },
  ];
}

function findNearestWallId(document: ArchitectureDocument, wallDrag: WallDragState): string | null {
  const previewMid: Point2 = [
    (wallDrag.startVertexOrigin[0] + wallDrag.endVertexOrigin[0]) / 2 + wallDrag.currentOffset[0],
    (wallDrag.startVertexOrigin[1] + wallDrag.endVertexOrigin[1]) / 2 + wallDrag.currentOffset[1],
  ];

  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const wallId of document.wallOrder) {
    const wall = document.walls[wallId];
    if (!wall) continue;
    const start = document.vertices[wall.startVertexId];
    const end = document.vertices[wall.endVertexId];
    if (!start || !end) continue;
    const mid: Point2 = [(start.x + end.x) / 2, (start.y + end.y) / 2];
    const distance = distanceBetweenPoints(mid, previewMid);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = wallId;
    }
  }

  return bestId;
}
