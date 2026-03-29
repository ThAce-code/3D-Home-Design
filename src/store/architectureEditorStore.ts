import { create } from 'zustand';
import type { Point2 } from '../architecture/topology/math.js';
import {
  createDefaultViewport,
  createEmptyHover,
  createEmptySelection,
  DEFAULT_ARCHITECTURE_TOOL,
  type ArchitectureHover,
  type ArchitectureSelection,
  type ArchitectureTool,
  type DraftWallState,
} from '../architecture/editing/tools.js';

export interface ArchitectureEditorState {
  activeTool: ArchitectureTool;
  draftWall: DraftWallState | null;
  selection: ArchitectureSelection;
  hover: ArchitectureHover;
  viewport: ReturnType<typeof createDefaultViewport>;
  setActiveTool: (tool: ArchitectureTool) => void;
  startDraftWall: (startPoint: Point2, snappedVertexId?: string | null) => void;
  updateDraftWall: (currentPoint: Point2, snappedVertexId?: string | null) => void;
  commitDraftWall: () => void;
  cancelDraftWall: () => void;
  setSelection: (selection: ArchitectureSelection) => void;
  clearSelection: () => void;
  setHover: (hover: ArchitectureHover) => void;
  clearHover: () => void;
  setGridSize: (gridSize: number) => void;
  setSnapEnabled: (snapEnabled: boolean) => void;
  setSnapTolerance: (snapTolerance: number) => void;
}

export const useArchitectureEditorStore = create<ArchitectureEditorState>()((set) => ({
  activeTool: DEFAULT_ARCHITECTURE_TOOL,
  draftWall: null,
  selection: createEmptySelection(),
  hover: createEmptyHover(),
  viewport: createDefaultViewport(),
  setActiveTool: (tool) => set((state) => ({
    activeTool: tool,
    draftWall: tool === 'wall' ? state.draftWall : null,
  })),
  startDraftWall: (startPoint, snappedVertexId = null) => set({
    activeTool: 'wall',
    draftWall: {
      startPoint,
      currentPoint: startPoint,
      snappedVertexId,
    },
  }),
  updateDraftWall: (currentPoint, snappedVertexId = null) => set((state) => ({
    draftWall: state.draftWall
      ? {
        ...state.draftWall,
        currentPoint,
        snappedVertexId,
      }
      : state.draftWall,
  })),
  commitDraftWall: () => set({
    draftWall: null,
  }),
  cancelDraftWall: () => set({
    draftWall: null,
  }),
  setSelection: (selection) => set({
    selection,
  }),
  clearSelection: () => set({
    selection: createEmptySelection(),
  }),
  setHover: (hover) => set({
    hover,
  }),
  clearHover: () => set({
    hover: createEmptyHover(),
  }),
  setGridSize: (gridSize) => set((state) => ({
    viewport: {
      ...state.viewport,
      gridSize,
    },
  })),
  setSnapEnabled: (snapEnabled) => set((state) => ({
    viewport: {
      ...state.viewport,
      snapEnabled,
    },
  })),
  setSnapTolerance: (snapTolerance) => set((state) => ({
    viewport: {
      ...state.viewport,
      snapTolerance,
    },
  })),
}));
