import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { createArchitectureHotkeyStoreController } from '../hotkeyController';

describe('architecture hotkey controller', () => {
  it('reads the latest store handlers when deleting the selected wall', () => {
    const document = createEmptyArchitectureDocument();
    const levelId = document.levelOrder[0];
    const level = document.levels[levelId];

    document.vertices = {
      v1: { id: 'v1', x: 0, y: 0 },
      v2: { id: 'v2', x: 4, y: 0 },
    };
    document.walls = {
      w1: {
        id: 'w1',
        levelId,
        startVertexId: 'v1',
        endVertexId: 'v2',
        thickness: level.defaultWallThickness,
        height: level.defaultWallHeight,
        kind: 'structural',
      },
    };
    document.wallOrder = ['w1'];
    document.levels[levelId] = {
      ...level,
      vertexIds: ['v1', 'v2'],
      wallIds: ['w1'],
      zoneIds: [],
    };

    const firstClearSelection = vi.fn();
    const latestClearSelection = vi.fn();
    const latestReplaceDocument = vi.fn();
    let editorState = {
      selection: {
        vertexIds: [],
        wallIds: [],
        zoneIds: [],
      },
      draftWall: null,
      clearSelection: firstClearSelection,
      cancelDraftWall: vi.fn(),
      setWallClosurePreview: vi.fn(),
    };
    let documentState = {
      document: createEmptyArchitectureDocument(),
      replaceDocument: vi.fn(),
    };
    const controller = createArchitectureHotkeyStoreController({
      editorStore: {
        getState: () => editorState,
      },
      documentStore: {
        getState: () => documentState,
      },
    });

    editorState = {
      ...editorState,
      selection: {
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      },
      clearSelection: latestClearSelection,
    };
    documentState = {
      document,
      replaceDocument: latestReplaceDocument,
    };

    controller.deleteSelection();

    expect(firstClearSelection).not.toHaveBeenCalled();
    expect(latestClearSelection).toHaveBeenCalledTimes(1);
    expect(latestReplaceDocument).toHaveBeenCalledTimes(1);
    expect(latestReplaceDocument.mock.calls[0]?.[0].wallOrder).toHaveLength(0);
  });

  it('clears the latest architecture selection and draft on secondary-click reset', () => {
    const firstClearSelection = vi.fn();
    const latestClearSelection = vi.fn();
    const latestCancelDraftWall = vi.fn();
    const latestSetWallClosurePreview = vi.fn();
    let editorState = {
      selection: {
        vertexIds: [],
        wallIds: [],
        zoneIds: [],
      },
      draftWall: null,
      clearSelection: firstClearSelection,
      cancelDraftWall: vi.fn(),
      setWallClosurePreview: vi.fn(),
    };
    const controller = createArchitectureHotkeyStoreController({
      editorStore: {
        getState: () => editorState,
      },
      documentStore: {
        getState: () => ({
          document: createEmptyArchitectureDocument(),
          replaceDocument: vi.fn(),
        }),
      },
    });

    editorState = {
      selection: {
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      },
      draftWall: {
        startPoint: [0, 0],
        currentPoint: [4, 0],
        snappedVertexId: null,
      },
      clearSelection: latestClearSelection,
      cancelDraftWall: latestCancelDraftWall,
      setWallClosurePreview: latestSetWallClosurePreview,
    };

    controller.clearSelectionOnSecondaryAction();

    expect(firstClearSelection).not.toHaveBeenCalled();
    expect(latestClearSelection).toHaveBeenCalledTimes(1);
    expect(latestCancelDraftWall).toHaveBeenCalledTimes(1);
    expect(latestSetWallClosurePreview).toHaveBeenCalledWith(null);
  });
});
