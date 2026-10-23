import { createArchitectureHistoryController } from '../architecture/editing/historyController.js';
import { useArchitectureDocumentStore } from '../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../store/architectureEditorStore.js';

// Shared adapter for toolbar and keyboard actions.
export const architectureHistoryActions = createArchitectureHistoryController({
  documentStore: useArchitectureDocumentStore,
  editorStore: useArchitectureEditorStore,
});
