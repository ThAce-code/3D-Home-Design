import type { ArchitectureDocument } from '../domain/document.js';
import type { DraftWallState, ArchitectureTool, ArchitectureViewportState } from './tools.js';
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

interface ArchitectureSceneControllerState {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  draftWall: DraftWallState | null;
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
  cancelDraftWall: NonNullable<ArchitectureInteractionCommandHandlers['cancelDraftWall']>;
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
      cancelDraftWall: () => editorStore.getState().cancelDraftWall(),
    },
  });
}
