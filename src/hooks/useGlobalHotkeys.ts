import { useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import type { DockTab, TransformTool } from '../types/camera.js';
import { useArchitectureDocumentStore } from '../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../store/architectureEditorStore.js';
import { createArchitectureHotkeyStoreController } from '../architecture/editing/hotkeyController.js';

const dockKeys: Record<string, DockTab> = {
  '1': 'building',
  '2': 'furniture',
  '3': 'materials',
  '4': 'measure',
  '5': 'export',
};

const toolOrder: TransformTool[] = ['translate', 'rotate', 'scale'];

const architectureHotkeyController = createArchitectureHotkeyStoreController({
  editorStore: useArchitectureEditorStore,
  documentStore: useArchitectureDocumentStore,
});

export function useGlobalHotkeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.temporal.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useStore.temporal.getState().redo();
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const { selectedItemId, removeItem } = useStore.getState();
        if (selectedItemId) {
          removeItem(selectedItemId);
          return;
        }

        architectureHotkeyController.deleteSelection();
        return;
      }

      if (!isInput) {
        const state = useStore.getState();

        // Transform tools
        if (e.key === 't' || e.key === 'T') state.setTransformTool('translate');
        if (e.key === 'r' || e.key === 'R') state.setTransformTool('rotate');
        if (e.key === 's' || e.key === 'S') state.setTransformTool('scale');
        if (e.key === 'f' || e.key === 'F') state.setFlying(!state.isFlying);

        // Q: cycle transform tool
        if (e.key === 'q' || e.key === 'Q') {
          const idx = toolOrder.indexOf(state.transformTool);
          state.setTransformTool(toolOrder[(idx + 1) % toolOrder.length]);
        }

        // 1-5: dock panel toggle
        const dockTab = dockKeys[e.key];
        if (dockTab) {
          state.toggleDock(dockTab);
        }
      }
    };

    const clearSelectionOnRightClick = () => {
      const { selectedItemId, selectItem, selectedAssetId, selectAsset } = useStore.getState();
      if (selectedItemId) selectItem(null);
      if (selectedAssetId) selectAsset(null);
      architectureHotkeyController.clearSelectionOnSecondaryAction();
    };

    const isSecondaryClick = (event: MouseEvent | PointerEvent) => {
      return event.button === 2 || event.buttons === 2;
    };

    const handleRightClickMouseDown = (e: MouseEvent) => {
      if (!isSecondaryClick(e)) return;
      e.preventDefault();
      e.stopPropagation();
      clearSelectionOnRightClick();
    };

    const handleRightClickPointerDown = (e: PointerEvent) => {
      if (!isSecondaryClick(e)) return;
      e.preventDefault();
      e.stopPropagation();
      clearSelectionOnRightClick();
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      clearSelectionOnRightClick();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleRightClickMouseDown, true);
    document.addEventListener('pointerdown', handleRightClickPointerDown, true);
    document.addEventListener('contextmenu', preventContextMenu, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleRightClickMouseDown, true);
      document.removeEventListener('pointerdown', handleRightClickPointerDown, true);
      document.removeEventListener('contextmenu', preventContextMenu, true);
    };
  }, []);
}
