import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureTool, ArchitectureViewportState } from './tools.js';
import type { Point2 } from '../topology/math.js';
import type { WallToolAxisLock, WallToolState, WallClosurePreviewCandidate } from './wallTool.js';
import { reduceArchitectureCommand } from './reducers.js';
import { resolveWallDraftSnap } from '../geometry/wallDraftSnap.js';

interface AdvanceWallDraftInteractionArgs {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  point: Point2;
  viewport: ArchitectureViewportState;
  wallTool: WallToolState;
}

interface UpdateWallDraftPointerArgs {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  point: Point2;
  viewport: ArchitectureViewportState;
  wallTool: WallToolState;
}

export function advanceWallDraftInteraction({
  activeTool,
  document,
  draftWall,
  point,
  viewport,
  wallTool,
}: AdvanceWallDraftInteractionArgs): {
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  closureCandidate: WallClosurePreviewCandidate | null;
  axisLock: WallToolAxisLock;
} {
  if (activeTool !== 'wall') {
    return {
      document,
      draftWall,
      closureCandidate: null,
      axisLock: 'free',
    };
  }

  if (!draftWall) {
    const snap = resolveWallDraftSnap({
      document,
      draftWall,
      rawPoint: point,
      viewport,
      wallTool,
    });

    return {
      document,
      draftWall: {
        startPoint: snap.point,
        currentPoint: snap.point,
        snappedVertexId: snap.snappedVertexId,
      },
      closureCandidate: null,
      axisLock: 'free',
    };
  }

  const snap = resolveWallDraftSnap({
    document,
    draftWall,
    rawPoint: point,
    viewport,
    wallTool,
  });
  const shouldUseClickSnap = snap.reason === 'closure' || snap.reason === 'endpoint';

  return {
    document: reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: draftWall.startPoint,
      end: shouldUseClickSnap ? snap.point : draftWall.currentPoint,
    }),
    draftWall: null,
    closureCandidate: snap.closureCandidate,
    axisLock: snap.axisLock,
  };
}

export function updateWallDraftPointer({
  activeTool,
  document,
  draftWall,
  point,
  viewport,
  wallTool,
}: UpdateWallDraftPointerArgs): {
  draftWall: DraftWallState | null;
  closureCandidate: WallClosurePreviewCandidate | null;
  axisLock: WallToolAxisLock;
} {
  if (activeTool !== 'wall' || !draftWall) {
    return {
      draftWall,
      closureCandidate: null,
      axisLock: 'free',
    };
  }

  const snap = resolveWallDraftSnap({
    document,
    draftWall,
    rawPoint: point,
    viewport,
    wallTool,
  });

  return {
    draftWall: {
      ...draftWall,
      currentPoint: snap.point,
      snappedVertexId: snap.snappedVertexId,
    },
    closureCandidate: snap.closureCandidate,
    axisLock: snap.axisLock,
  };
}
