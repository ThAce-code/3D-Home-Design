import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import { repairTopology } from '../topology/repair.js';
import { createEmptySelection, type ArchitectureViewportState, type WallDragState } from './tools.js';
import type { ArchitectureInteractionCommand } from './interaction.js';

const REPAIR_EPSILON = 1e-6;

export function createWallDragState(args: {
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
  };
}

export function getWallDragOffsetForPoint(args: {
  wallDrag: WallDragState;
  currentPoint: Point2;
}): Point2 {
  const originMidpoint: Point2 = [
    (args.wallDrag.startVertexOrigin[0] + args.wallDrag.endVertexOrigin[0]) / 2,
    (args.wallDrag.startVertexOrigin[1] + args.wallDrag.endVertexOrigin[1]) / 2,
  ];
  const targetMidpoint: Point2 = [
    args.currentPoint[0] - args.wallDrag.grabOffset[0],
    args.currentPoint[1] - args.wallDrag.grabOffset[1],
  ];

  return [
    targetMidpoint[0] - originMidpoint[0],
    targetMidpoint[1] - originMidpoint[1],
  ];
}

export function resolveWallDragSnap(args: {
  rawOffset: Point2;
  viewport: ArchitectureViewportState;
}): Point2 {
  if (!args.viewport.snapEnabled || args.viewport.gridSize <= 0) {
    return args.rawOffset;
  }

  const snapped: Point2 = [
    Math.round(args.rawOffset[0] / args.viewport.gridSize) * args.viewport.gridSize,
    Math.round(args.rawOffset[1] / args.viewport.gridSize) * args.viewport.gridSize,
  ];
  const distance = Math.hypot(
    args.rawOffset[0] - snapped[0],
    args.rawOffset[1] - snapped[1],
  );

  return distance <= args.viewport.snapTolerance ? snapped : args.rawOffset;
}

export function getWallDragPreviewPositions(args: {
  wallDrag: WallDragState;
}): { startPosition: Point2; endPosition: Point2 } {
  return {
    startPosition: [
      args.wallDrag.startVertexOrigin[0] + args.wallDrag.currentOffset[0],
      args.wallDrag.startVertexOrigin[1] + args.wallDrag.currentOffset[1],
    ],
    endPosition: [
      args.wallDrag.endVertexOrigin[0] + args.wallDrag.currentOffset[0],
      args.wallDrag.endVertexOrigin[1] + args.wallDrag.currentOffset[1],
    ],
  };
}

function moveVerticesBatch(
  document: ArchitectureDocument,
  moves: Array<{ vertexId: string; to: Point2 }>,
): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);

  for (const move of moves) {
    const vertex = next.vertices[move.vertexId];
    if (!vertex) {
      continue;
    }

    next.vertices[move.vertexId] = {
      ...vertex,
      x: move.to[0],
      y: move.to[1],
    };
  }

  return repairTopology(syncLevelEntityIds(next), REPAIR_EPSILON);
}

export function getWallDragCommitEffects(args: {
  document: ArchitectureDocument;
  wallDrag: WallDragState;
}): ArchitectureInteractionCommand[] {
  const { startPosition, endPosition } = getWallDragPreviewPositions({
    wallDrag: args.wallDrag,
  });
  const nextDocument = moveVerticesBatch(args.document, [
    { vertexId: args.wallDrag.startVertexId, to: startPosition },
    { vertexId: args.wallDrag.endVertexId, to: endPosition },
  ]);

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
        wallIds: nextDocument.walls[args.wallDrag.wallId] ? [args.wallDrag.wallId] : [],
      },
    },
  ];
}
