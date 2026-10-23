import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { applyDrawWall } from '../../topology/repair';
import { createDefaultViewport } from '../tools';
import { createDefaultWallToolState } from '../wallTool';
import {
  createArchitectureSceneController,
  createArchitectureSceneStoreController,
} from '../sceneController';

describe('architecture scene controller', () => {
  it('selects the containing zone from a scene pointer-down event', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);

    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
    };
    const stopPropagation = vi.fn();
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'select',
        document,
        draftWall: null,
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handlePointerDown({
      point: { x: 2, z: 1.5 },
      stopPropagation,
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(handlers.setSelection).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [],
      zoneIds: [document.zoneOrder[0]],
    });
  });

  it('prevents default and enables numeric entry on wall-tool tab', () => {
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
    };
    const preventDefault = vi.fn();
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'wall',
        document: createEmptyArchitectureDocument(),
        draftWall: null,
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handleKeyDown({
      key: 'Tab',
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handlers.setWallNumericEntryEnabled).toHaveBeenCalledWith(true);
  });

  it('cancels the current draft on context-menu events', () => {
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
    };
    const stopPropagation = vi.fn();
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'wall',
        document: createEmptyArchitectureDocument(),
        draftWall: {
          startPoint: [0, 0],
          currentPoint: [2, 0],
          snappedVertexId: null,
        },
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handleContextMenu({
      stopPropagation,
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(handlers.setWallClosurePreview).toHaveBeenCalledWith(null);
    expect(handlers.cancelDraftWall).toHaveBeenCalledTimes(1);
  });

  it('reads the latest store state and handlers without recreating the controller', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);

    const firstNumericEntryHandler = vi.fn();
    const latestNumericEntryHandler = vi.fn();
    const latestSelectionHandler = vi.fn();
    let editorState = {
      activeTool: 'wall' as const,
      draftWall: null,
      viewport: createDefaultViewport(),
      toolState: {
        wall: createDefaultWallToolState(),
      },
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: firstNumericEntryHandler,
      cancelDraftWall: vi.fn(),
    };
    let documentState = {
      document: createEmptyArchitectureDocument(),
      replaceDocument: vi.fn(),
    };
    const controller = createArchitectureSceneStoreController({
      editorStore: {
        getState: () => editorState,
      },
      documentStore: {
        getState: () => documentState,
      },
    });

    editorState = {
      ...editorState,
      setWallNumericEntryEnabled: latestNumericEntryHandler,
    };

    controller.handleKeyDown({
      key: 'Tab',
      preventDefault: vi.fn(),
    });

    editorState = {
      ...editorState,
      activeTool: 'select',
      setSelection: latestSelectionHandler,
    };
    documentState = {
      ...documentState,
      document,
    };
    controller.handlePointerDown({
      point: { x: 2, z: 1.5 },
      stopPropagation: vi.fn(),
    });

    expect(firstNumericEntryHandler).not.toHaveBeenCalled();
    expect(latestNumericEntryHandler).toHaveBeenCalledWith(true);
    expect(latestSelectionHandler).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [],
      zoneIds: [document.zoneOrder[0]],
    });
  });

  it('updates and commits vertex drag state from pointer move and pointer up', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    const vertexId = document.walls[document.wallOrder[0]].startVertexId;
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
      updateVertexDrag: vi.fn(),
      commitVertexDrag: vi.fn(),
    };
    let vertexDrag = {
      vertexId,
      startPosition: [0, 0] as [number, number],
      currentPosition: [0, 0] as [number, number],
      snappedToVertexId: null,
    };
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'select',
        document,
        draftWall: null,
        vertexDrag,
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handlePointerMove({
      point: { x: 2.04, z: 0.02 },
    });

    expect(handlers.updateVertexDrag).toHaveBeenCalledWith([2, 0], null);

    vertexDrag = {
      ...vertexDrag,
      currentPosition: [2, 0],
    };
    controller.handlePointerUp({
      point: { x: 2, z: 0 },
    });

    expect(handlers.replaceDocument).toHaveBeenCalledTimes(1);
    expect(handlers.commitVertexDrag).toHaveBeenCalledTimes(1);
  });

  it('updates and commits wall drag state from pointer move and pointer up', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    const wallId = document.wallOrder[0];
    const wall = document.walls[wallId];
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
      updateWallDrag: vi.fn(),
      commitWallDrag: vi.fn(),
    };
    let wallDrag = {
      wallId,
      startVertexId: wall.startVertexId,
      endVertexId: wall.endVertexId,
      startVertexOrigin: [0, 0] as [number, number],
      endVertexOrigin: [4, 0] as [number, number],
      grabOffset: [0, 0] as [number, number],
      currentOffset: [0, 0] as [number, number],
    };
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'select',
        document,
        draftWall: null,
        wallDrag,
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handlePointerMove({
      point: { x: 3, z: 2 },
    });

    expect(handlers.updateWallDrag).toHaveBeenCalledWith([1, 2]);

    wallDrag = {
      ...wallDrag,
      currentOffset: [1, 2],
    };
    controller.handlePointerUp({
      point: { x: 3, z: 2 },
    });

    expect(handlers.replaceDocument).toHaveBeenCalledTimes(1);
    expect(handlers.commitWallDrag).toHaveBeenCalledTimes(1);
    expect(handlers.setSelection).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [wallId],
      zoneIds: [],
    });
  });

  it('cancels active vertex drag from select-tool escape key events', () => {
    const handlers = {
      setSelection: vi.fn(),
      setWallClosurePreview: vi.fn(),
      startDraftWall: vi.fn(),
      replaceDocument: vi.fn(),
      commitDraftWall: vi.fn(),
      setCursorPoint: vi.fn(),
      updateDraftWall: vi.fn(),
      setWallToolModifiers: vi.fn(),
      setWallNumericEntryEnabled: vi.fn(),
      cancelDraftWall: vi.fn(),
      cancelVertexDrag: vi.fn(),
    };
    const controller = createArchitectureSceneController({
      getState: () => ({
        activeTool: 'select',
        document: createEmptyArchitectureDocument(),
        draftWall: null,
        vertexDrag: {
          vertexId: 'v1',
          startPosition: [0, 0],
          currentPosition: [2, 0],
          snappedToVertexId: null,
        },
        viewport: createDefaultViewport(),
        wallTool: createDefaultWallToolState(),
      }),
      handlers,
    });

    controller.handleKeyDown({
      key: 'Escape',
    });

    expect(handlers.cancelVertexDrag).toHaveBeenCalledTimes(1);
    expect(handlers.setSelection).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [],
      zoneIds: [],
    });
  });
});
