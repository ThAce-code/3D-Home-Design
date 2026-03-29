import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureTool } from './tools.js';
import type { Point2 } from '../topology/math.js';
import { reduceArchitectureCommand } from './reducers.js';

interface AdvanceWallDraftInteractionArgs {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  point: Point2;
}

interface UpdateWallDraftPointerArgs {
  activeTool: ArchitectureTool;
  draftWall: DraftWallState | null;
  point: Point2;
}

export function advanceWallDraftInteraction({
  activeTool,
  document,
  draftWall,
  point,
}: AdvanceWallDraftInteractionArgs): {
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
} {
  if (activeTool !== 'wall') {
    return {
      document,
      draftWall,
    };
  }

  if (!draftWall) {
    return {
      document,
      draftWall: {
        startPoint: point,
        currentPoint: point,
        snappedVertexId: null,
      },
    };
  }

  return {
    document: reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: draftWall.startPoint,
      end: point,
    }),
    draftWall: null,
  };
}

export function updateWallDraftPointer({
  activeTool,
  draftWall,
  point,
}: UpdateWallDraftPointerArgs): DraftWallState | null {
  if (activeTool !== 'wall' || !draftWall) {
    return draftWall;
  }

  return {
    ...draftWall,
    currentPoint: point,
    snappedVertexId: null,
  };
}
