import type {
  ArchitectureDocumentControllerState,
  StoreAccessor,
} from './controllerStores.js';
import { reduceArchitectureCommand } from './reducers.js';
import type { ArchitectureSelection, DraftWallState } from './tools.js';
import type { WallClosurePreviewCandidate } from './wallTool.js';
import { updateArchitectureDocumentStore } from './controllerStores.js';

interface ArchitectureHotkeyEditorState {
  selection: ArchitectureSelection;
  draftWall: DraftWallState | null;
  clearSelection: () => void;
  cancelDraftWall: () => void;
  setWallClosurePreview: (candidate: WallClosurePreviewCandidate | null) => void;
}

interface CreateArchitectureHotkeyStoreControllerArgs {
  editorStore: StoreAccessor<ArchitectureHotkeyEditorState>;
  documentStore: StoreAccessor<ArchitectureDocumentControllerState>;
}

export function createArchitectureHotkeyStoreController({
  editorStore,
  documentStore,
}: CreateArchitectureHotkeyStoreControllerArgs) {
  return {
    deleteSelection() {
      const editorState = editorStore.getState();
      const wallId = editorState.selection.wallIds[0];
      const vertexId = editorState.selection.vertexIds[0];

      if (!wallId && !vertexId) {
        return false;
      }

      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, wallId
        ? { type: 'DELETE_WALL', wallId }
        : { type: 'DELETE_VERTEX', vertexId: vertexId! }));
      editorStore.getState().clearSelection();
      return true;
    },

    clearSelectionOnSecondaryAction() {
      const editorState = editorStore.getState();
      if (
        editorState.selection.wallIds.length
        || editorState.selection.vertexIds.length
        || editorState.selection.zoneIds.length
      ) {
        editorState.clearSelection();
      }
      if (editorState.draftWall) {
        editorStore.getState().cancelDraftWall();
      }
      editorStore.getState().setWallClosurePreview(null);
    },
  };
}
