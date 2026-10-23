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
      const { wallIds, vertexIds, zoneIds } = editorState.selection;

      if (!wallIds.length && !vertexIds.length && !zoneIds.length) {
        return false;
      }

      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'DELETE_SELECTION', wallIds, vertexIds, zoneIds,
      }));
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
