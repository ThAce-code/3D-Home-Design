import { create } from 'zustand';
import type { Point2 } from '../architecture/topology/math.js';
import {
  createDefaultArchitectureToolState,
  createDefaultViewport,
  createEmptyHover,
  createEmptySelection,
  DEFAULT_ARCHITECTURE_TOOL,
  type ArchitectureHover,
  type ArchitectureSelection,
  type ArchitectureTool,
  type ArchitectureToolState,
  type DraftWallState,
} from '../architecture/editing/tools.js';
import {
  armWallTool,
  createDefaultWallToolState,
  previewWallClosure,
  setWallNumericEntryEnabled,
  updateWallToolModifiers,
  type WallClosurePreviewCandidate,
} from '../architecture/editing/wallTool.js';

export interface ArchitectureEditorState {
  activeTool: ArchitectureTool;
  draftWall: DraftWallState | null;
  cursorPoint: Point2 | null;
  toolState: ArchitectureToolState;
  selection: ArchitectureSelection;
  hover: ArchitectureHover;
  viewport: ReturnType<typeof createDefaultViewport>;
  setActiveTool: (tool: ArchitectureTool) => void;
  startDraftWall: (startPoint: Point2, snappedVertexId?: string | null) => void;
  updateDraftWall: (currentPoint: Point2, snappedVertexId?: string | null) => void;
  commitDraftWall: () => void;
  cancelDraftWall: () => void;
  setCursorPoint: (point: Point2 | null) => void;
  setSelection: (selection: ArchitectureSelection) => void;
  clearSelection: () => void;
  setHover: (hover: ArchitectureHover) => void;
  clearHover: () => void;
  setGridSize: (gridSize: number) => void;
  setSnapEnabled: (snapEnabled: boolean) => void;
  setSnapTolerance: (snapTolerance: number) => void;
  setWallToolModifiers: (modifiers: { shiftKey?: boolean; altKey?: boolean }) => void;
  setWallNumericEntryEnabled: (numericEntryEnabled: boolean) => void;
  setWallClosurePreview: (candidate: WallClosurePreviewCandidate | null) => void;
}

export const useArchitectureEditorStore = create<ArchitectureEditorState>()((set) => ({
  activeTool: DEFAULT_ARCHITECTURE_TOOL,
  draftWall: null,
  cursorPoint: null,
  toolState: createDefaultArchitectureToolState(),
  selection: createEmptySelection(),
  hover: createEmptyHover(),
  viewport: createDefaultViewport(),
  setActiveTool: (tool) => set((state) => ({
    activeTool: tool,
    draftWall: tool === 'wall' ? state.draftWall : null,
    cursorPoint: tool === 'wall' ? state.cursorPoint : null,
    toolState: {
      ...state.toolState,
      wall: tool === 'wall' ? state.toolState.wall : createDefaultWallToolState(),
    },
  })),
  startDraftWall: (startPoint, snappedVertexId = null) => set({
    activeTool: 'wall',
    cursorPoint: startPoint,
    draftWall: {
      startPoint,
      currentPoint: startPoint,
      snappedVertexId,
    },
    toolState: {
      wall: armWallTool(createDefaultWallToolState()),
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
    cursorPoint: currentPoint,
  })),
  commitDraftWall: () => set({
    draftWall: null,
    toolState: {
      wall: createDefaultWallToolState(),
    },
  }),
  cancelDraftWall: () => set({
    draftWall: null,
    toolState: {
      wall: createDefaultWallToolState(),
    },
  }),
  setCursorPoint: (cursorPoint) => set({
    cursorPoint,
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
  setWallToolModifiers: (modifiers) => set((state) => ({
    toolState: {
      ...state.toolState,
      wall: updateWallToolModifiers(state.toolState.wall, modifiers),
    },
  })),
  setWallNumericEntryEnabled: (numericEntryEnabled) => set((state) => ({
    toolState: {
      ...state.toolState,
      wall: setWallNumericEntryEnabled(state.toolState.wall, numericEntryEnabled),
    },
  })),
  setWallClosurePreview: (candidate) => set((state) => ({
    toolState: {
      ...state.toolState,
      wall: previewWallClosure(state.toolState.wall, candidate),
    },
  })),
}));
