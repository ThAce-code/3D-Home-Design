import type { ArchitectureDocument } from '../domain/document.js';
import type {
  ArchitectureSelection,
  DraftWallState,
  ArchitectureTool,
  ArchitectureViewportState,
} from './tools.js';
import type { Point2 } from '../topology/math.js';
import type { WallToolAxisLock, WallToolState, WallClosurePreviewCandidate } from './wallTool.js';
import { reduceArchitectureCommand } from './reducers.js';
import { resolveWallDraftSnap } from '../geometry/wallDraftSnap.js';
import { findZoneIdContainingPoint } from '../geometry/zoneSelection.js';
import { isPointNearWallFootprint } from '../geometry/wallSelection.js';

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

interface ArchitectureSceneKeyboardArgs {
  activeTool: ArchitectureTool;
  key: string;
}

interface ArchitectureScenePointEvent {
  point?: {
    x: number;
    z: number;
  };
}

interface WallMeshPointerDownArgs {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  wallId: string;
  intersections: Array<{
    objectName: string;
    point: Point2;
  }>;
}

interface ZoneMeshPointerDownArgs {
  activeTool: ArchitectureTool;
  zoneId: string;
}

export type ArchitectureInteractionCommand =
  | {
    type: 'set-selection';
    selection: ArchitectureSelection;
  }
  | {
    type: 'set-wall-closure-preview';
    candidate: WallClosurePreviewCandidate | null;
  }
  | {
    type: 'start-draft-wall';
    draftWall: DraftWallState;
  }
  | {
    type: 'replace-document';
    document: ArchitectureDocument;
  }
  | {
    type: 'commit-draft-wall';
  }
  | {
    type: 'set-cursor-point';
    point: Point2 | null;
  }
  | {
    type: 'update-draft-wall';
    draftWall: DraftWallState;
  }
  | {
    type: 'set-wall-tool-modifiers';
    modifiers: {
      shiftKey?: boolean;
      altKey?: boolean;
    };
  }
  | {
    type: 'set-wall-numeric-entry-enabled';
    enabled: boolean;
  }
  | {
    type: 'cancel-draft-wall';
  };

interface ArchitectureSceneEffects {
  commands: ArchitectureInteractionCommand[];
  shouldPreventDefault?: boolean;
}

interface ArchitectureScenePointerEffects extends ArchitectureSceneEffects {
  shouldStopPropagation: boolean;
}

export interface ArchitectureInteractionCommandHandlers {
  setSelection?: (selection: ArchitectureSelection) => void;
  setWallClosurePreview?: (candidate: WallClosurePreviewCandidate | null) => void;
  startDraftWall?: (startPoint: Point2, snappedVertexId?: string | null) => void;
  replaceDocument?: (document: ArchitectureDocument) => void;
  commitDraftWall?: () => void;
  setCursorPoint?: (point: Point2 | null) => void;
  updateDraftWall?: (currentPoint: Point2, snappedVertexId?: string | null) => void;
  setWallToolModifiers?: (modifiers: { shiftKey?: boolean; altKey?: boolean }) => void;
  setWallNumericEntryEnabled?: (enabled: boolean) => void;
  cancelDraftWall?: () => void;
}

function createEmptySelection(): ArchitectureSelection {
  return {
    vertexIds: [],
    wallIds: [],
    zoneIds: [],
  };
}

export function applyArchitectureInteractionCommands(
  commands: ArchitectureInteractionCommand[],
  handlers: ArchitectureInteractionCommandHandlers,
) {
  commands.forEach((command) => {
    switch (command.type) {
      case 'set-selection':
        handlers.setSelection?.(command.selection);
        break;
      case 'set-wall-closure-preview':
        handlers.setWallClosurePreview?.(command.candidate);
        break;
      case 'start-draft-wall':
        handlers.startDraftWall?.(command.draftWall.startPoint, command.draftWall.snappedVertexId);
        break;
      case 'replace-document':
        handlers.replaceDocument?.(command.document);
        break;
      case 'commit-draft-wall':
        handlers.commitDraftWall?.();
        break;
      case 'set-cursor-point':
        handlers.setCursorPoint?.(command.point);
        break;
      case 'update-draft-wall':
        handlers.updateDraftWall?.(command.draftWall.currentPoint, command.draftWall.snappedVertexId);
        break;
      case 'set-wall-tool-modifiers':
        handlers.setWallToolModifiers?.(command.modifiers);
        break;
      case 'set-wall-numeric-entry-enabled':
        handlers.setWallNumericEntryEnabled?.(command.enabled);
        break;
      case 'cancel-draft-wall':
        handlers.cancelDraftWall?.();
        break;
    }
  });
}

export function getArchitectureScenePoint(event: ArchitectureScenePointEvent): Point2 | null {
  if (!event.point) {
    return null;
  }

  return [event.point.x, event.point.z];
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

export function getArchitectureScenePointerDownEffects({
  activeTool,
  document,
  draftWall,
  point,
  viewport,
  wallTool,
}: AdvanceWallDraftInteractionArgs): ArchitectureScenePointerEffects {
  if (activeTool === 'select') {
    const zoneId = findZoneIdContainingPoint(document, point);
    if (!zoneId) {
      return {
        shouldStopPropagation: false,
        commands: [],
      };
    }

    return {
      shouldStopPropagation: true,
      commands: [
        {
          type: 'set-selection',
          selection: {
            ...createEmptySelection(),
            zoneIds: [zoneId],
          },
        },
      ],
    };
  }

  if (activeTool !== 'wall') {
    return {
      shouldStopPropagation: false,
      commands: [],
    };
  }

  const next = advanceWallDraftInteraction({
    activeTool,
    document,
    draftWall,
    point,
    viewport,
    wallTool,
  });

  if (!draftWall && next.draftWall) {
    return {
      shouldStopPropagation: true,
      commands: [
        {
          type: 'set-wall-closure-preview',
          candidate: null,
        },
        {
          type: 'start-draft-wall',
          draftWall: next.draftWall,
        },
      ],
    };
  }

  if (!next.draftWall) {
    return {
      shouldStopPropagation: true,
      commands: [
        {
          type: 'set-wall-closure-preview',
          candidate: null,
        },
        {
          type: 'replace-document',
          document: next.document,
        },
        {
          type: 'commit-draft-wall',
        },
      ],
    };
  }

  return {
    shouldStopPropagation: true,
    commands: [],
  };
}

export function getArchitectureScenePointerMoveEffects({
  activeTool,
  document,
  draftWall,
  point,
  viewport,
  wallTool,
}: UpdateWallDraftPointerArgs): ArchitectureSceneEffects {
  if (activeTool !== 'wall') {
    return { commands: [] };
  }

  const preview = updateWallDraftPointer({
    activeTool,
    document,
    draftWall,
    point,
    viewport,
    wallTool,
  });

  if (!preview.draftWall) {
    const snap = resolveWallDraftSnap({
      document,
      draftWall: null,
      rawPoint: point,
      viewport,
      wallTool,
    });

    return {
      commands: [
        {
          type: 'set-cursor-point',
          point: snap.point,
        },
      ],
    };
  }

  return {
    commands: [
      {
        type: 'set-cursor-point',
        point: preview.draftWall.currentPoint,
      },
      {
        type: 'set-wall-closure-preview',
        candidate: preview.closureCandidate,
      },
      {
        type: 'update-draft-wall',
        draftWall: preview.draftWall,
      },
    ],
  };
}

export function getArchitectureSceneKeyDownEffects({
  activeTool,
  key,
}: ArchitectureSceneKeyboardArgs): ArchitectureSceneEffects {
  if (activeTool !== 'wall') {
    return { commands: [] };
  }

  if (key === 'Shift') {
    return {
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { shiftKey: true },
        },
      ],
    };
  }

  if (key === 'Alt') {
    return {
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { altKey: true },
        },
      ],
    };
  }

  if (key === 'Tab') {
    return {
      shouldPreventDefault: true,
      commands: [
        {
          type: 'set-wall-numeric-entry-enabled',
          enabled: true,
        },
      ],
    };
  }

  if (key === 'Escape') {
    return {
      commands: [
        {
          type: 'set-wall-closure-preview',
          candidate: null,
        },
        {
          type: 'set-wall-numeric-entry-enabled',
          enabled: false,
        },
        {
          type: 'cancel-draft-wall',
        },
      ],
    };
  }

  return { commands: [] };
}

export function getArchitectureSceneKeyUpEffects({
  activeTool,
  key,
}: ArchitectureSceneKeyboardArgs): ArchitectureSceneEffects {
  if (activeTool !== 'wall') {
    return { commands: [] };
  }

  if (key === 'Shift') {
    return {
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { shiftKey: false },
        },
      ],
    };
  }

  if (key === 'Alt') {
    return {
      commands: [
        {
          type: 'set-wall-tool-modifiers',
          modifiers: { altKey: false },
        },
      ],
    };
  }

  return { commands: [] };
}

export function getArchitectureSceneContextMenuEffects(): ArchitectureScenePointerEffects {
  return {
    shouldStopPropagation: true,
    commands: [
      {
        type: 'set-wall-closure-preview',
        candidate: null,
      },
      {
        type: 'cancel-draft-wall',
      },
    ],
  };
}

export function getWallMeshPointerDownEffects({
  activeTool,
  document,
  wallId,
  intersections,
}: WallMeshPointerDownArgs): ArchitectureScenePointerEffects {
  if (activeTool === 'delete') {
    return {
      shouldStopPropagation: true,
      commands: [
        {
          type: 'replace-document',
          document: reduceArchitectureCommand(document, {
            type: 'DELETE_WALL',
            wallId,
          }),
        },
        {
          type: 'set-selection',
          selection: createEmptySelection(),
        },
      ],
    };
  }

  if (activeTool !== 'select') {
    return {
      shouldStopPropagation: false,
      commands: [],
    };
  }

  const groundIntersection = intersections.find((intersection) => (
    intersection.objectName === 'architecture-interaction-plane'
    || intersection.objectName === 'floor-plane'
  ));
  const groundPoint = groundIntersection?.point ?? null;
  const zoneId = groundPoint ? findZoneIdContainingPoint(document, groundPoint) : null;
  const shouldPreferZone = Boolean(
    zoneId
    && groundPoint
    && !isPointNearWallFootprint(document, wallId, groundPoint)
  );

  return {
    shouldStopPropagation: true,
    commands: [
      {
        type: 'set-selection',
        selection: shouldPreferZone && zoneId
          ? {
            ...createEmptySelection(),
            zoneIds: [zoneId],
          }
          : {
            ...createEmptySelection(),
            wallIds: [wallId],
          },
      },
    ],
  };
}

export function getZoneMeshPointerDownEffects({
  activeTool,
  zoneId,
}: ZoneMeshPointerDownArgs): ArchitectureScenePointerEffects {
  if (activeTool !== 'select') {
    return {
      shouldStopPropagation: false,
      commands: [],
    };
  }

  return {
    shouldStopPropagation: true,
    commands: [
      {
        type: 'set-selection',
        selection: {
          ...createEmptySelection(),
          zoneIds: [zoneId],
        },
      },
    ],
  };
}
