import type { ArchitectureDocument } from '../domain/document.js';
import type { ArchitectureSelection, ArchitectureTool } from './tools.js';
import type {
  ArchitectureDocumentControllerState,
  StoreAccessor,
} from './controllerStores.js';
import {
  applyArchitectureInteractionCommands,
  getWallMeshPointerDownEffects,
  getZoneMeshPointerDownEffects,
  type ArchitectureInteractionCommandHandlers,
} from './interaction.js';

interface ArchitectureMeshControllerState {
  activeTool: ArchitectureTool;
  document: ArchitectureDocument;
  selection: ArchitectureSelection;
}

interface CreateArchitectureMeshControllerArgs {
  getState: () => ArchitectureMeshControllerState;
  handlers: Pick<ArchitectureInteractionCommandHandlers, 'setSelection' | 'replaceDocument'>;
}

interface ArchitectureMeshEditorControllerState {
  activeTool: ArchitectureTool;
  selection: ArchitectureSelection;
  setSelection: NonNullable<ArchitectureInteractionCommandHandlers['setSelection']>;
}

interface CreateArchitectureMeshStoreControllerArgs {
  editorStore: StoreAccessor<ArchitectureMeshEditorControllerState>;
  documentStore: StoreAccessor<ArchitectureDocumentControllerState & {
    replaceDocument: NonNullable<ArchitectureInteractionCommandHandlers['replaceDocument']>;
  }>;
}

interface ArchitectureMeshIntersectionEvent {
  stopPropagation?: () => void;
  intersections?: Array<{
    object?: {
      name?: string;
    };
    point: {
      x: number;
      z: number;
    };
  }>;
  nativeEvent?: {
    shiftKey?: boolean;
    intersections?: Array<{
      object?: {
        name?: string;
      };
      point: {
        x: number;
        z: number;
      };
    }>;
  };
  shiftKey?: boolean;
}

interface ArchitectureZoneMeshEvent {
  stopPropagation?: () => void;
  nativeEvent?: {
    shiftKey?: boolean;
  };
  shiftKey?: boolean;
}

function getWallMeshIntersections(event: ArchitectureMeshIntersectionEvent) {
  const intersections = Array.isArray(event.intersections)
    ? event.intersections
    : Array.isArray(event.nativeEvent?.intersections)
      ? event.nativeEvent.intersections
      : [];

  return intersections.map((intersection) => ({
    objectName: intersection.object?.name ?? '',
    point: [intersection.point.x, intersection.point.z] as [number, number],
  }));
}

export function createArchitectureMeshController({
  getState,
  handlers,
}: CreateArchitectureMeshControllerArgs) {
  return {
    handleWallPointerDown(wallId: string, event: ArchitectureMeshIntersectionEvent) {
      const state = getState();
      const effects = getWallMeshPointerDownEffects({
        activeTool: state.activeTool,
        document: state.document,
        wallId,
        currentSelection: state.selection,
        shiftKey: event.shiftKey ?? event.nativeEvent?.shiftKey ?? false,
        intersections: getWallMeshIntersections(event),
      });

      if (effects.shouldStopPropagation) {
        event.stopPropagation?.();
      }

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },

    handleZonePointerDown(zoneId: string, event: ArchitectureZoneMeshEvent) {
      const state = getState();
      const effects = getZoneMeshPointerDownEffects({
        activeTool: state.activeTool,
        zoneId,
        currentSelection: state.selection,
        shiftKey: event.shiftKey ?? event.nativeEvent?.shiftKey ?? false,
      });

      if (effects.shouldStopPropagation) {
        event.stopPropagation?.();
      }

      applyArchitectureInteractionCommands(effects.commands, handlers);
    },
  };
}

export function createArchitectureMeshStoreController({
  editorStore,
  documentStore,
}: CreateArchitectureMeshStoreControllerArgs) {
  return createArchitectureMeshController({
    getState: () => {
      const editorState = editorStore.getState();
      const documentState = documentStore.getState();

      return {
        activeTool: editorState.activeTool,
        selection: editorState.selection,
        document: documentState.document,
      };
    },
    handlers: {
      setSelection: (selection) => editorStore.getState().setSelection(selection),
      replaceDocument: (document) => documentStore.getState().replaceDocument(document),
    },
  });
}
