import { describe, expect, it, vi } from 'vitest';
import { createEmptyArchitectureDocument } from '../../domain/document';
import { applyDrawWall } from '../../topology/repair';
import { createArchitectureMeshStoreController } from '../meshController';

describe('architecture mesh controller', () => {
  it('reads the latest wall-mesh store state and handlers without recreating the controller', () => {
    let document = createEmptyArchitectureDocument();
    document = applyDrawWall(document, [0, 0], [4, 0]);
    document = applyDrawWall(document, [4, 0], [4, 3]);
    document = applyDrawWall(document, [4, 3], [0, 3]);
    document = applyDrawWall(document, [0, 3], [0, 0]);
    const wallId = document.wallOrder[0];

    const firstSelectionHandler = vi.fn();
    const latestSelectionHandler = vi.fn();
    let editorState = {
      activeTool: 'wall' as const,
      setSelection: firstSelectionHandler,
    };
    let documentState = {
      document: createEmptyArchitectureDocument(),
      replaceDocument: vi.fn(),
    };
    const controller = createArchitectureMeshStoreController({
      editorStore: {
        getState: () => editorState,
      },
      documentStore: {
        getState: () => documentState,
      },
    });

    editorState = {
      activeTool: 'select',
      setSelection: latestSelectionHandler,
    };
    documentState = {
      ...documentState,
      document,
    };

    controller.handleWallPointerDown(wallId, {
      stopPropagation: vi.fn(),
      nativeEvent: {
        intersections: [
          {
            object: {
              name: 'architecture-interaction-plane',
            },
            point: {
              x: 2,
              z: 1.5,
            },
          },
        ],
      },
    });

    expect(firstSelectionHandler).not.toHaveBeenCalled();
    expect(latestSelectionHandler).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [],
      zoneIds: [document.zoneOrder[0]],
    });
  });

  it('reads the latest zone-mesh selection handler without recreating the controller', () => {
    const firstSelectionHandler = vi.fn();
    const latestSelectionHandler = vi.fn();
    let editorState = {
      activeTool: 'wall' as const,
      setSelection: firstSelectionHandler,
    };
    const controller = createArchitectureMeshStoreController({
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
      activeTool: 'select',
      setSelection: latestSelectionHandler,
    };

    controller.handleZonePointerDown('z-room', {
      stopPropagation: vi.fn(),
    });

    expect(firstSelectionHandler).not.toHaveBeenCalled();
    expect(latestSelectionHandler).toHaveBeenCalledWith({
      vertexIds: [],
      wallIds: [],
      zoneIds: ['z-room'],
    });
  });
});
