import type { StateCreator } from 'zustand';
import type { DockTab, TransformTool } from '../../types/camera.js';

export interface UiSlice {
  activeTab: DockTab;
  dockOpen: boolean;
  transformTool: TransformTool;
  setActiveTab: (tab: DockTab) => void;
  toggleDock: (tab: DockTab) => void;
  setDockOpen: (v: boolean) => void;
  setTransformTool: (tool: TransformTool) => void;
}

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], [], UiSlice> = (set) => ({
  activeTab: 'rooms',
  dockOpen: false,
  transformTool: 'translate',
  setActiveTab: (tab) => set((s) => { s.activeTab = tab; s.dockOpen = true; }),
  toggleDock: (tab) => set((s) => {
    if (s.activeTab === tab && s.dockOpen) {
      s.dockOpen = false;
    } else {
      s.activeTab = tab;
      s.dockOpen = true;
    }
  }),
  setDockOpen: (v) => set((s) => { s.dockOpen = v; }),
  setTransformTool: (tool) => set((s) => { s.transformTool = tool; }),
});
