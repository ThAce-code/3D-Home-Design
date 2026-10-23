import type { ArchitectureDocument } from '../domain/document.js';
import type { Point2 } from '../topology/math.js';
import { distanceBetweenPoints } from '../topology/math.js';
import { reduceArchitectureCommand } from './reducers.js';
import { createEmptySelection, type ArchitectureViewportState } from './tools.js';
import type { ArchitectureInteractionCommand } from './interaction.js';

export function resolveVertexDragSnap(args: {
  document: ArchitectureDocument;
  dragVertexId: string;
  rawPoint: Point2;
  viewport: ArchitectureViewportState;
}): {
  point: Point2;
  snappedToVertexId: string | null;
} {
  const endpointSnap = findNearestEndpointSnap(
    args.document,
    args.dragVertexId,
    args.rawPoint,
    args.viewport.snapTolerance,
  );

  if (endpointSnap) {
    return endpointSnap;
  }

  const gridPoint = resolveGridSnap(args.rawPoint, args.viewport.gridSize, args.viewport.snapTolerance);
  if (gridPoint) {
    return {
      point: gridPoint,
      snappedToVertexId: null,
    };
  }

  return {
    point: args.rawPoint,
    snappedToVertexId: null,
  };
}

export function getVertexDragCommitEffects(args: {
  document: ArchitectureDocument;
  vertexId: string;
  targetPosition: Point2;
}): ArchitectureInteractionCommand[] {
  const nextDocument = reduceArchitectureCommand(args.document, {
    type: 'MOVE_VERTEX',
    vertexId: args.vertexId,
    to: args.targetPosition,
  });
  const connectedWallIds = nextDocument.vertices[args.vertexId]
    ? nextDocument.wallOrder.filter((wallId) => {
      const wall = nextDocument.walls[wallId];

      return wall?.startVertexId === args.vertexId || wall?.endVertexId === args.vertexId;
    })
    : [];

  return [
    {
      type: 'replace-document',
      document: nextDocument,
    },
    {
      type: 'commit-vertex-drag',
    },
    {
      type: 'set-selection',
      selection: {
        ...createEmptySelection(),
        wallIds: connectedWallIds,
      },
    },
  ];
}

function findNearestEndpointSnap(
  document: ArchitectureDocument,
  dragVertexId: string,
  rawPoint: Point2,
  snapTolerance: number,
): { point: Point2; snappedToVertexId: string } | null {
  let nearest: { point: Point2; snappedToVertexId: string } | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const vertex of Object.values(document.vertices)) {
    if (vertex.id === dragVertexId) {
      continue;
    }

    const point: Point2 = [vertex.x, vertex.y];
    const distance = distanceBetweenPoints(rawPoint, point);

    if (distance > snapTolerance || distance >= nearestDistance) {
      continue;
    }

    nearestDistance = distance;
    nearest = {
      point,
      snappedToVertexId: vertex.id,
    };
  }

  return nearest;
}

function resolveGridSnap(rawPoint: Point2, gridSize: number, snapTolerance: number): Point2 | null {
  if (gridSize <= 0) {
    return null;
  }

  const snapped: Point2 = [
    Math.round(rawPoint[0] / gridSize) * gridSize,
    Math.round(rawPoint[1] / gridSize) * gridSize,
  ];

  return distanceBetweenPoints(rawPoint, snapped) <= snapTolerance ? snapped : null;
}
