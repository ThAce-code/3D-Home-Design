import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureViewportState } from '../editing/tools.js';
import type { WallClosurePreviewCandidate, WallToolAxisLock, WallToolState } from '../editing/wallTool.js';
import { distanceBetweenPoints, dot2D, subtractPoints, type Point2 } from '../topology/math.js';

export type WallDraftSnapReason =
  | 'closure'
  | 'endpoint'
  | 'wall-body'
  | 'axis-lock'
  | 'axis-suggestion'
  | 'grid'
  | 'free';

export interface WallBodySnapCandidate {
  wallId: string;
  point: Point2;
}

interface FindNearestWallBodySnapCandidateOptions {
  draftStartPoint?: Point2 | null;
}

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

    const nearEndpointCandidate = resolveNearWallEndpointCandidate(document, rawPoint, viewport.snapTolerance);
    if (nearEndpointCandidate) {
      return {
        point: nearEndpointCandidate.point,
        snappedVertexId: nearEndpointCandidate.vertexId,
        closureCandidate: null,
        axisLock: 'free',
        reason: 'endpoint',
      };
    }

    const wallBodyCandidate = findNearestWallBodySnapCandidate(document, rawPoint, viewport.snapTolerance);
    if (wallBodyCandidate) {
      return {
        point: wallBodyCandidate.point,
        snappedVertexId: null,
        closureCandidate: null,
        axisLock: 'free',
        reason: 'wall-body',
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

  const nearEndpointCandidate = resolveNearWallEndpointCandidate(document, rawPoint, viewport.snapTolerance);
  if (nearEndpointCandidate) {
    return {
      point: nearEndpointCandidate.point,
      snappedVertexId: nearEndpointCandidate.vertexId,
      closureCandidate: null,
      axisLock: 'free',
      reason: 'endpoint',
    };
  }

  const basePoint = wallTool.modifiers.shiftKey
    ? projectOrthogonal(draftWall.startPoint, rawPoint).point
    : rawPoint;
  const wallBodyCandidate = findNearestWallBodySnapCandidate(document, basePoint, viewport.snapTolerance, {
    draftStartPoint: draftWall.startPoint,
  });
  if (wallBodyCandidate) {
    return {
      point: wallBodyCandidate.point,
      snappedVertexId: null,
      closureCandidate: null,
      axisLock: wallTool.modifiers.shiftKey ? projectOrthogonal(draftWall.startPoint, rawPoint).axisLock : 'free',
      reason: 'wall-body',
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

function resolveNearWallEndpointCandidate(
  document: ArchitectureDocument,
  rawPoint: Point2,
  snapTolerance: number,
): WallClosurePreviewCandidate | null {
  let nearestCandidate: WallClosurePreviewCandidate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const wallId of document.wallOrder) {
    const wall = document.walls[wallId];

    if (!wall) {
      continue;
    }

    const startVertex = document.vertices[wall.startVertexId];
    const endVertex = document.vertices[wall.endVertexId];

    if (!startVertex || !endVertex) {
      continue;
    }

    const start: Point2 = [startVertex.x, startVertex.y];
    const end: Point2 = [endVertex.x, endVertex.y];
    const projection = projectPointOntoSegment(rawPoint, start, end);
    const distanceToWall = distanceBetweenPoints(rawPoint, projection.point);

    if (distanceToWall > snapTolerance) {
      continue;
    }

    const startDistanceAlongWall = distanceBetweenPoints(projection.point, start);
    const endDistanceAlongWall = distanceBetweenPoints(projection.point, end);
    const candidate = startDistanceAlongWall <= endDistanceAlongWall
      ? { vertexId: wall.startVertexId, point: start, distance: distanceBetweenPoints(rawPoint, start) }
      : { vertexId: wall.endVertexId, point: end, distance: distanceBetweenPoints(rawPoint, end) };

    const alongWallDistance = Math.min(startDistanceAlongWall, endDistanceAlongWall);
    if (alongWallDistance > snapTolerance || candidate.distance >= nearestDistance) {
      continue;
    }

    nearestDistance = candidate.distance;
    nearestCandidate = {
      vertexId: candidate.vertexId,
      point: candidate.point,
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

export function findNearestWallBodySnapCandidate(
  document: ArchitectureDocument,
  rawPoint: Point2,
  snapTolerance: number,
  options: FindNearestWallBodySnapCandidateOptions = {},
): WallBodySnapCandidate | null {
  let nearestCandidate: WallBodySnapCandidate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const wallId of document.wallOrder) {
    const wall = document.walls[wallId];

    if (!wall) {
      continue;
    }

    const startVertex = document.vertices[wall.startVertexId];
    const endVertex = document.vertices[wall.endVertexId];

    if (!startVertex || !endVertex) {
      continue;
    }

    const start: Point2 = [startVertex.x, startVertex.y];
    const end: Point2 = [endVertex.x, endVertex.y];
    const projection = projectPointOntoSegment(rawPoint, start, end);

    if (projection.t <= 1e-6 || projection.t >= 1 - 1e-6) {
      continue;
    }

    const distance = distanceBetweenPoints(rawPoint, projection.point);
    const wallDirection = subtractPoints(end, start);
    const draftDirection = options.draftStartPoint
      ? subtractPoints(rawPoint, options.draftStartPoint)
      : null;
    const wallBodySnapTolerance = resolveWallBodySnapTolerance(
      wall.thickness,
      snapTolerance,
      wallDirection,
      draftDirection,
    );
    if (distance > wallBodySnapTolerance || distance >= nearestDistance) {
      continue;
    }

    nearestDistance = distance;
    nearestCandidate = {
      wallId,
      point: projection.point,
    };
  }

  return nearestCandidate;
}

function resolveWallBodySnapTolerance(
  wallThickness: number,
  snapTolerance: number,
  wallDirection: Point2,
  draftDirection: Point2 | null,
): number {
  const strictTolerance = Math.min(snapTolerance, wallThickness * 0.25);

  if (!draftDirection) {
    return strictTolerance;
  }

  const wallLength = Math.hypot(wallDirection[0], wallDirection[1]);
  const draftLength = Math.hypot(draftDirection[0], draftDirection[1]);

  if (wallLength <= 1e-6 || draftLength <= 1e-6) {
    return strictTolerance;
  }

  const alignment = Math.abs(dot2D(wallDirection, draftDirection) / (wallLength * draftLength));
  const isNearParallel = alignment >= 0.9;

  if (isNearParallel) {
    return strictTolerance;
  }

  return Math.min(snapTolerance, wallThickness * 0.5);
}

function projectPointOntoSegment(point: Point2, start: Point2, end: Point2): { point: Point2; t: number } {
  const direction = subtractPoints(end, start);
  const lengthSquared = dot2D(direction, direction);

  if (lengthSquared <= 1e-9) {
    return {
      point: start,
      t: 0,
    };
  }

  const t = Math.min(1, Math.max(0, dot2D(subtractPoints(point, start), direction) / lengthSquared));

  return {
    point: [
      start[0] + (direction[0] * t),
      start[1] + (direction[1] * t),
    ],
    t,
  };
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
