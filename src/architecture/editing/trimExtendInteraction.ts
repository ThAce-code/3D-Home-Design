import {
  cloneArchitectureDocument,
  syncLevelEntityIds,
  type ArchitectureDocument,
} from '../domain/document.js';
import { cross2D, subtractPoints, type Point2 } from '../topology/math.js';
import { repairTopology } from '../topology/repair.js';
import { createEmptySelection } from './tools.js';
import type { ArchitectureInteractionCommand } from './interaction.js';

const REPAIR_EPSILON = 1e-6;
const LINE_EPSILON = 1e-9;

export type TrimAxis = 'horizontal' | 'vertical';

export interface Line2 {
  start: Point2;
  end: Point2;
}

export function getWallSegment(
  document: ArchitectureDocument,
  wallId: string,
): Line2 | null {
  const wall = document.walls[wallId];
  if (!wall) {
    return null;
  }

  const startVertex = document.vertices[wall.startVertexId];
  const endVertex = document.vertices[wall.endVertexId];
  if (!startVertex || !endVertex) {
    return null;
  }

  return {
    start: [startVertex.x, startVertex.y],
    end: [endVertex.x, endVertex.y],
  };
}

/** Intersection of two infinite lines. Returns parametric t on line A (0=start, 1=end). */
export function intersectInfiniteLines(
  lineA: Line2,
  lineB: Line2,
  epsilon = LINE_EPSILON,
): { point: Point2; t: number; u: number } | null {
  const segmentA = subtractPoints(lineA.end, lineA.start);
  const segmentB = subtractPoints(lineB.end, lineB.start);
  const offset = subtractPoints(lineB.start, lineA.start);
  const denominator = cross2D(segmentA, segmentB);

  if (Math.abs(denominator) <= epsilon) {
    return null;
  }

  const t = cross2D(offset, segmentB) / denominator;
  const u = cross2D(offset, segmentA) / denominator;

  return {
    point: [
      lineA.start[0] + segmentA[0] * t,
      lineA.start[1] + segmentA[1] * t,
    ],
    t,
    u,
  };
}

export function axisLineThroughPoint(point: Point2, axis: TrimAxis): Line2 {
  if (axis === 'horizontal') {
    return {
      start: [point[0] - 1, point[1]],
      end: [point[0] + 1, point[1]],
    };
  }

  return {
    start: [point[0], point[1] - 1],
    end: [point[0], point[1] + 1],
  };
}

export function resolveTrimEndpoint(t: number): 'start' | 'end' {
  return t < 0.5 ? 'start' : 'end';
}

export function trimExtendWallToLine(
  document: ArchitectureDocument,
  wallId: string,
  targetLine: Line2,
): ArchitectureDocument | null {
  const segment = getWallSegment(document, wallId);
  if (!segment) {
    return null;
  }

  const intersection = intersectInfiniteLines(segment, targetLine);
  if (!intersection) {
    return null;
  }

  const wall = document.walls[wallId];
  if (!wall) {
    return null;
  }

  const endpoint = resolveTrimEndpoint(intersection.t);
  const vertexId = endpoint === 'start' ? wall.startVertexId : wall.endVertexId;
  const vertex = document.vertices[vertexId];
  if (!vertex) {
    return null;
  }

  const next = cloneArchitectureDocument(document);
  next.vertices[vertexId] = {
    ...vertex,
    x: intersection.point[0],
    y: intersection.point[1],
  };

  return repairTopology(syncLevelEntityIds(next), REPAIR_EPSILON);
}

export function trimExtendWallToWall(
  document: ArchitectureDocument,
  wallId: string,
  targetWallId: string,
): ArchitectureDocument | null {
  if (wallId === targetWallId) {
    return null;
  }

  const targetSegment = getWallSegment(document, targetWallId);
  if (!targetSegment) {
    return null;
  }

  return trimExtendWallToLine(document, wallId, targetSegment);
}

export function trimExtendWallToAxis(
  document: ArchitectureDocument,
  wallId: string,
  point: Point2,
  axis: TrimAxis,
): ArchitectureDocument | null {
  return trimExtendWallToLine(document, wallId, axisLineThroughPoint(point, axis));
}

export function getTrimExtendCommitEffects(args: {
  document: ArchitectureDocument;
  wallId: string;
  targetWallId?: string;
  axis?: { point: Point2; axis: TrimAxis };
}): ArchitectureInteractionCommand[] {
  const nextDocument = args.targetWallId
    ? trimExtendWallToWall(args.document, args.wallId, args.targetWallId)
    : args.axis
      ? trimExtendWallToAxis(args.document, args.wallId, args.axis.point, args.axis.axis)
      : null;

  if (!nextDocument) {
    return [];
  }

  return [
    {
      type: 'replace-document',
      document: nextDocument,
    },
    {
      type: 'set-selection',
      selection: {
        ...createEmptySelection(),
        wallIds: nextDocument.walls[args.wallId] ? [args.wallId] : [],
      },
    },
  ];
}
