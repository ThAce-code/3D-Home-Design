import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureTool, ArchitectureViewportState, VertexDragState, WallDragState } from './tools.js';
import type { WallToolState } from './wallTool.js';
import type {
  ArchitectureDocumentControllerState,
  StoreAccessor,
} from './controllerStores.js';
import {
  applyArchitectureInteractionCommands,
  getArchitectureSceneContextMenuEffects,
  getArchitectureSceneKeyDownEffects,
  getArchitectureSceneKeyUpEffects,
  getArchitectureScenePoint,
  getArchitectureScenePointerDownEffects,
  getArchitectureScenePointerMoveEffects,
  type ArchitectureInteractionCommandHandlers,
} from './interaction.js';
import {
  getVertexDragCommitEffects,
  resolveVertexDragSnap,
} from './vertexDragInteraction.js';
import {
  getWallDragCommitEffects,
  getWallDragOffsetForPoint,
  resolveWallDragSnap,
} from './wallDragInteraction.js';

interface ArchitectureSceneControllerState {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
  vertexDrag?: VertexDragState | null;
  wallDrag?: WallDragState | null;
  viewport: ArchitectureViewportState;
  wallTool: WallToolState;
}

interface CreateArchitectureSceneControllerArgs {
  getState: () => ArchitectureSceneControllerState;
  handlers: ArchitectureInteractionCommandHandlers;
}

interface ArchitectureEditorControllerState {
  activeTool: ArchitectureTool;
  draftWall: DraftWallState | null;
  vertexDrag?: VertexDragState | null;
  wallDrag?: WallDragState | null;
  viewport: ArchitectureViewportState;
  toolState: {
    wall: WallToolState;
  };
  setSelection: NonNullable<ArchitectureInteractionCommandHandlers['setSelection']>;
  setWallClosurePreview: NonNullable<ArchitectureInteractionCommandHandlers['setWallClosurePreview']>;
  startDraftWall: NonNullable<ArchitectureInteractionCommandHandlers['startDraftWall']>;
  commitDraftWall: NonNullable<ArchitectureInteractionCommandHandlers['commitDraftWall']>;
  setCursorPoint: NonNullable<ArchitectureInteractionCommandHandlers['setCursorPoint']>;
  updateDraftWall: NonNullable<ArchitectureInteractionCommandHandlers['updateDraftWall']>;
  setWallToolModifiers: NonNullable<ArchitectureInteractionCommandHandlers['setWallToolModifiers']>;
  setWallNumericEntryEnabled: NonNullable<ArchitectureInteractionCommandHandlers['setWallNumericEntryEnabled']>;
  setVertexDragNumericEntryEnabled?: NonNullable<ArchitectureInteractionCommandHandlers['setVertexDragNumericEntryEnabled']>;
  setWallDragNumericEntryEnabled?: NonNullable<ArchitectureInteractionCommandHandlers['setWallDragNumericEntryEnabled']>;
  cancelDraftWall: NonNullable<ArchitectureInteractionCommandHandlers['cancelDraftWall']>;
  updateVertexDrag?: NonNullable<ArchitectureInteractionCommandHandlers['updateVertexDrag']>;
  commitVertexDrag?: NonNullable<ArchitectureInteractionCommandHandlers['commitVertexDrag']>;
  cancelVertexDrag?: NonNullable<ArchitectureInteractionCommandHandlers['cancelVertexDrag']>;
  updateWallDrag?: NonNullable<ArchitectureInteractionCommandHandlers['updateWallDrag']>;
  commitWallDrag?: NonNullable<ArchitectureInteractionCommandHandlers['commitWallDrag']>;
  cancelWallDrag?: NonNullable<ArchitectureInteractionCommandHandlers['cancelWallDrag']>;
}

interface CreateArchitectureSceneStoreControllerArgs {
  editorStore: StoreAccessor<ArchitectureEditorControllerState>;
  documentStore: StoreAccessor<ArchitectureDocumentControllerState & {
    replaceDocument: NonNullable<ArchitectureInteractionCommandHandlers['replaceDocument']>;
  }>;
}

interface ArchitectureScenePointEvent {
  point?: {
    x: number;
    z: number;
  };
  stopPropagation?: () => void;
}

interface ArchitectureSceneKeyEvent {
  key: string;
  preventDefault?: () => void;
}

interface ArchitectureSceneContextMenuEvent {
  stopPropagation?: () => void;
}

export function createArchitectureSceneController({
  getState,
  handlers,
}: CreateArchitectureSceneControllerArgs) {
  return {
    handlePointerDown(event: ArchitectureScenePointEvent) {
      const point = getArchitectureScenePoint(event);
      if (!point) {
        return;
      }

      const state = getState();
      const effects = getArchitectureScenePointerDownEffects({
        activeTool: state.activeTool,
        document: state.document,
        draftWall: state.draftWall,
        point,
        viewport: state.viewport,
        wallTool: state.wallTool,
      });

      if (effects.shouldStopPropagation) {
        event.stopPropagation?.();
      }

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },

    handlePointerMove(event: ArchitectureScenePointEvent) {
      const point = getArchitectureScenePoint(event);
      if (!point) {
        return;
      }

      const state = getState();
      if (state.vertexDrag) {
        if (state.vertexDrag.numericEntryEnabled) return;
        const snap = resolveVertexDragSnap({
          document: state.document,
          dragVertexId: state.vertexDrag.vertexId,
          rawPoint: point,
          viewport: state.viewport,
        });
        handlers.updateVertexDrag?.(snap.point, snap.snappedToVertexId);
        return;
      }

      if (state.wallDrag) {
        if (state.wallDrag.numericEntryEnabled) return;
        const rawOffset = getWallDragOffsetForPoint({
          wallDrag: state.wallDrag,
          currentPoint: point,
        });
        const currentOffset = resolveWallDragSnap({
          rawOffset,
          viewport: state.viewport,
        });

        handlers.updateWallDrag?.(currentOffset);
        return;
      }

      const effects = getArchitectureScenePointerMoveEffects({
        activeTool: state.activeTool,
        document: state.document,
        draftWall: state.draftWall,
        point,
        viewport: state.viewport,
        wallTool: state.wallTool,
      });

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },

    handlePointerUp(event: ArchitectureScenePointEvent) {
      const point = getArchitectureScenePoint(event);
      const state = getState();

      if (state.vertexDrag) {
        if (state.vertexDrag.numericEntryEnabled) return;
        const targetPosition = point
          ? resolveVertexDragSnap({
            document: state.document,
            dragVertexId: state.vertexDrag.vertexId,
            rawPoint: point,
            viewport: state.viewport,
          }).point
          : state.vertexDrag.currentPosition;
        const commands = getVertexDragCommitEffects({
          document: state.document,
          vertexId: state.vertexDrag.vertexId,
          targetPosition,
        });

        applyArchitectureInteractionCommands(commands, handlers);
        return;
      }

      if (state.wallDrag) {
        if (state.wallDrag.numericEntryEnabled) return;
        const currentOffset = point
          ? resolveWallDragSnap({
            rawOffset: getWallDragOffsetForPoint({
              wallDrag: state.wallDrag,
              currentPoint: point,
            }),
            viewport: state.viewport,
          })
          : state.wallDrag.currentOffset;
        const commands = getWallDragCommitEffects({
          document: state.document,
          wallDrag: {
            ...state.wallDrag,
            currentOffset,
          },
        });

        applyArchitectureInteractionCommands(commands, handlers);
      }
    },

    handleContextMenu(event: ArchitectureSceneContextMenuEvent) {
      const effects = getArchitectureSceneContextMenuEffects();

      if (effects.shouldStopPropagation) {
        event.stopPropagation?.();
      }

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },

    handleKeyDown(event: ArchitectureSceneKeyEvent) {
      const state = getState();
      const effects = getArchitectureSceneKeyDownEffects({
        activeTool: state.activeTool,
        key: event.key,
        vertexDrag: state.vertexDrag ?? null,
        wallDrag: state.wallDrag ?? null,
      });

      if (effects.shouldPreventDefault) {
        event.preventDefault?.();
      }

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },

    handleKeyUp(event: ArchitectureSceneKeyEvent) {
      const state = getState();
      const effects = getArchitectureSceneKeyUpEffects({
        activeTool: state.activeTool,
        key: event.key,
      });

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },
  };
}

export function createArchitectureSceneStoreController({
  editorStore,
  documentStore,
}: CreateArchitectureSceneStoreControllerArgs) {
  return createArchitectureSceneController({
    getState: () => {
      const editorState = editorStore.getState();
      const documentState = documentStore.getState();

      return {
        activeTool: editorState.activeTool,
        document: documentState.document,
        draftWall: editorState.draftWall,
        vertexDrag: editorState.vertexDrag ?? null,
        wallDrag: editorState.wallDrag ?? null,
        viewport: editorState.viewport,
        wallTool: editorState.toolState.wall,
      };
    },
    handlers: {
      setSelection: (selection) => editorStore.getState().setSelection(selection),
      setWallClosurePreview: (candidate) => editorStore.getState().setWallClosurePreview(candidate),
      startDraftWall: (startPoint, snappedVertexId) => editorStore.getState().startDraftWall(startPoint, snappedVertexId),
      replaceDocument: (document) => documentStore.getState().replaceDocument(document),
      commitDraftWall: () => editorStore.getState().commitDraftWall(),
      setCursorPoint: (point) => editorStore.getState().setCursorPoint(point),
      updateDraftWall: (currentPoint, snappedVertexId) => editorStore.getState().updateDraftWall(currentPoint, snappedVertexId),
      setWallToolModifiers: (modifiers) => editorStore.getState().setWallToolModifiers(modifiers),
      setWallNumericEntryEnabled: (enabled) => editorStore.getState().setWallNumericEntryEnabled(enabled),
      setVertexDragNumericEntryEnabled: (enabled) => editorStore.getState().setVertexDragNumericEntryEnabled?.(enabled),
      setWallDragNumericEntryEnabled: (enabled) => editorStore.getState().setWallDragNumericEntryEnabled?.(enabled),
      cancelDraftWall: () => editorStore.getState().cancelDraftWall(),
      updateVertexDrag: (currentPosition, snappedToVertexId) => editorStore.getState().updateVertexDrag?.(currentPosition, snappedToVertexId),
      commitVertexDrag: () => editorStore.getState().commitVertexDrag?.(),
      cancelVertexDrag: () => editorStore.getState().cancelVertexDrag?.(),
      updateWallDrag: (currentOffset) => editorStore.getState().updateWallDrag?.(currentOffset),
      commitWallDrag: () => editorStore.getState().commitWallDrag?.(),
      cancelWallDrag: () => editorStore.getState().cancelWallDrag?.(),
    },
  });
}
