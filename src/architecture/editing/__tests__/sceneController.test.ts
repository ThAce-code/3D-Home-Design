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
});
