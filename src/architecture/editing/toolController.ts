import type { ArchitectureTool } from './tools.js';
import type { StoreAccessor } from './controllerStores.js';

interface ArchitectureToolEditorState {
  activeTool: ArchitectureTool;
  setActiveTool: (tool: ArchitectureTool) => void;
}

interface CreateArchitectureToolStoreControllerArgs {
  editorStore: StoreAccessor<ArchitectureToolEditorState>;
}

export function createArchitectureToolStoreController({
  editorStore,
}: CreateArchitectureToolStoreControllerArgs) {
  return {
    selectTool(tool: ArchitectureTool) {
      editorStore.getState().setActiveTool(tool);
    },
  };
}
