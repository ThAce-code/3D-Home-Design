import type { StoreAccessor } from './controllerStores.js';

interface HistoryDocumentState {
  undo: () => boolean;
  redo: () => boolean;
}

interface HistoryEditorState {
  draftWall: unknown;
  vertexDrag: unknown;
  wallDrag: unknown;
  cancelDraftWall: () => void;
  cancelVertexDrag: () => void;
  cancelWallDrag: () => void;
  clearSelection: () => void;
  clearHover: () => void;
  setWallClosurePreview: (candidate: null) => void;
}

export function createArchitectureHistoryController({ documentStore, editorStore }: {
  documentStore: StoreAccessor<HistoryDocumentState>;
  editorStore: StoreAccessor<HistoryEditorState>;
}) {
  return {
    perform(direction: 'undo' | 'redo') {
      const editor = editorStore.getState();
      const hasPreview = Boolean(editor.draftWall || editor.vertexDrag || editor.wallDrag);
      editor.cancelDraftWall();
      editor.cancelVertexDrag();
      editor.cancelWallDrag();
      editor.setWallClosurePreview(null);
      const changed = hasPreview || documentStore.getState()[direction]();
      if (changed) {
        editor.clearSelection();
        editor.clearHover();
      }
      return changed;
    },
  };
}
