import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureViewportState } from '../editing/tools.js';
import type { WallClosurePreviewCandidate, WallToolAxisLock, WallToolState } from '../editing/wallTool.js';
import { distanceBetweenPoints, type Point2 } from '../topology/math.js';

export type WallDraftSnapReason =
  | 'closure'
  | 'endpoint'
  | 'axis-lock'
  | 'axis-suggestion'
  | 'grid'
  | 'free';

export interface ResolveWallDraftSnapArgs {
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  rawPoint: Point2;
  viewport: ArchitectureViewportState;
  wallTool: WallToolState;
}

export interface WallDraftSnapResult {
  point: Point2;
  snappedVertexId: string | null;
  closureCandidate: WallClosurePreviewCandidate | null;
  axisLock: WallToolAxisLock;
  reason: WallDraftSnapReason;
}

export function resolveWallDraftSnap({
  document,
  draftWall,
  rawPoint,
  viewport,
  wallTool,
}: ResolveWallDraftSnapArgs): WallDraftSnapResult {
  if (!draftWall) {
    return {
      point: rawPoint,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: 'free',
      reason: 'free',
    };
  }

  if (wallTool.modifiers.altKey) {
    return {
      point: rawPoint,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: 'free',
      reason: 'free',
    };
  }

  const closureCandidate = resolveClosureCandidate(draftWall, rawPoint, viewport.snapTolerance);
  if (closureCandidate) {
    return {
      point: closureCandidate.point,
      snappedVertexId: closureCandidate.vertexId,
      closureCandidate,
      axisLock: 'free',
      reason: 'closure',
    };
  }

  const endpointCandidate = resolveEndpointCandidate(document, rawPoint, viewport.snapTolerance);
  if (endpointCandidate) {
    return {
      point: endpointCandidate.point,
      snappedVertexId: endpointCandidate.vertexId,
      closureCandidate: null,
      axisLock: 'free',
      reason: 'endpoint',
    };
  }

  if (wallTool.modifiers.shiftKey) {
    const projected = projectOrthogonal(draftWall.startPoint, rawPoint);

    return {
      point: projected.point,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: projected.axisLock,
      reason: 'axis-lock',
    };
  }

  const suggested = suggestOrthogonal(draftWall.startPoint, rawPoint, viewport.snapTolerance);
  if (suggested) {
    return {
      point: suggested.point,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: suggested.axisLock,
      reason: 'axis-suggestion',
    };
  }

  const gridPoint = resolveGridSnap(rawPoint, viewport.gridSize, viewport.snapTolerance);
  if (gridPoint) {
    return {
      point: gridPoint,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: 'free',
      reason: 'grid',
    };
  }

  return {
    point: rawPoint,
    snappedVertexId: null,
    closureCandidate: null,
    axisLock: 'free',
    reason: 'free',
  };
}

function resolveClosureCandidate(
  draftWall: DraftWallState,
  rawPoint: Point2,
  snapTolerance: number,
): WallClosurePreviewCandidate | null {
  if (distanceBetweenPoints(draftWall.startPoint, rawPoint) > snapTolerance) {
    return null;
  }

  return {
    vertexId: 'draft-start',
    point: draftWall.startPoint,
  };
}

function resolveEndpointCandidate(
  document: ArchitectureDocument,
  rawPoint: Point2,
  snapTolerance: number,
): WallClosurePreviewCandidate | null {
  let nearestCandidate: WallClosurePreviewCandidate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const vertex of Object.values(document.vertices)) {
    const point: Point2 = [vertex.x, vertex.y];
    const distance = distanceBetweenPoints(point, rawPoint);

    if (distance > snapTolerance || distance >= nearestDistance) {
      continue;
    }

    nearestDistance = distance;
    nearestCandidate = {
      vertexId: vertex.id,
      point,
    };
  }

  return nearestCandidate;
}

function projectOrthogonal(startPoint: Point2, rawPoint: Point2): { point: Point2; axisLock: WallToolAxisLock } {
  const dx = rawPoint[0] - startPoint[0];
  const dy = rawPoint[1] - startPoint[1];

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      point: [rawPoint[0], startPoint[1]],
      axisLock: 'horizontal',
    };
  }

  return {
    point: [startPoint[0], rawPoint[1]],
    axisLock: 'vertical',
  };
}

function suggestOrthogonal(
  startPoint: Point2,
  rawPoint: Point2,
  snapTolerance: number,
): { point: Point2; axisLock: WallToolAxisLock } | null {
  const dx = rawPoint[0] - startPoint[0];
  const dy = rawPoint[1] - startPoint[1];

  if (Math.abs(dy) <= snapTolerance) {
    return {
      point: [rawPoint[0], startPoint[1]],
      axisLock: 'horizontal',
    };
  }

  if (Math.abs(dx) <= snapTolerance) {
    return {
      point: [startPoint[0], rawPoint[1]],
      axisLock: 'vertical',
    };
  }

  return null;
}

function resolveGridSnap(rawPoint: Point2, gridSize: number, snapTolerance: number): Point2 | null {
  if (gridSize <= 0) {
    return null;
  }

  const snapped: Point2 = [
    Math.round(rawPoint[0] / gridSize) * gridSize,
    Math.round(rawPoint[1] / gridSize) * gridSize,
  ];

  if (distanceBetweenPoints(rawPoint, snapped) > snapTolerance) {
    return null;
  }

  return snapped;
}
