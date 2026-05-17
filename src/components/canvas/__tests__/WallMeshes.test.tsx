import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { editorTheme } from '../../../theme/editorTheme';

const moveToSpy = vi.fn();
const lineToSpy = vi.fn();
const closePathSpy = vi.fn();
const buildWallMeshDescriptorsMock = vi.fn();

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockShape {
    moveTo(x: number, y: number) {
      moveToSpy(x, y);
    }

    lineTo(x: number, y: number) {
      lineToSpy(x, y);
    }

    closePath() {
      closePathSpy();
    }
  }

  return {
    ...actual,
    Shape: MockShape,
  };
});

vi.mock('../../../architecture/geometry/wallMeshes', () => ({
  buildWallMeshDescriptors: (...args: unknown[]) => buildWallMeshDescriptorsMock(...args),
}));

import WallMeshes from '../WallMeshes';

function createDocumentWithWall(): ArchitectureDocument {
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

  return document;
}

describe('WallMeshes', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    moveToSpy.mockClear();
    lineToSpy.mockClear();
    closePathSpy.mockClear();
    buildWallMeshDescriptorsMock.mockReset();
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    consoleErrorSpy.mockRestore();
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('mirrors wall footprint depth into Shape space before the X-axis extrusion rotation', () => {
    buildWallMeshDescriptorsMock.mockReturnValue([
      {
        wallId: 'w1',
        levelId: 'level-1',
        origin: [0, 0],
        length: 4,
        thickness: 0.2,
        height: 3,
        angle: 0,
        start: [0, 0],
        end: [4, 0],
        footprintPoints: [
          [0, -0.1],
          [4.1, -0.1],
          [4, 0],
          [3.9, 0.1],
          [0, 0.1],
        ],
      },
    ]);

    act(() => {
      root.render(<WallMeshes />);
    });

    expect(moveToSpy).toHaveBeenCalledWith(0, 0.1);
    expect(lineToSpy).toHaveBeenNthCalledWith(1, 4.1, 0.1);
    expect(lineToSpy).toHaveBeenNthCalledWith(2, 4, -0);
    expect(lineToSpy).toHaveBeenNthCalledWith(3, 3.9, -0.1);
    expect(lineToSpy).toHaveBeenNthCalledWith(4, 0, -0.1);
    expect(closePathSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the selected wall material color for the selected wall', () => {
    buildWallMeshDescriptorsMock.mockReturnValue([
      {
        wallId: 'w-selected',
        levelId: 'level-1',
        origin: [0, 0],
        length: 4,
        thickness: 0.2,
        height: 3,
        angle: 0,
        start: [0, 0],
        end: [4, 0],
        footprintPoints: [
          [0, -0.1],
          [4, -0.1],
          [4, 0.1],
          [0, 0.1],
        ],
      },
    ]);

    act(() => {
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w-selected'],
        zoneIds: [],
      });
      root.render(<WallMeshes />);
    });

    const material = mountNode.querySelector('[name="wall:w-selected"] meshstandardmaterial');

    expect(material?.getAttribute('color')).toBe(editorTheme.selected);
    expect(material?.getAttribute('opacity')).toBe('0.85');
  });

  it('starts wall body drag from pointer down on a selected wall mesh', () => {
    buildWallMeshDescriptorsMock.mockReturnValue([
      {
        wallId: 'w1',
        levelId: 'level-1',
        origin: [0, 0],
        length: 4,
        thickness: 0.2,
        height: 3,
        angle: 0,
        start: [0, 0],
        end: [4, 0],
        footprintPoints: [
          [0, -0.1],
          [4, -0.1],
          [4, 0.1],
          [0, 0.1],
        ],
      },
    ]);

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<WallMeshes />);
    });

    const wallMesh = mountNode.querySelector('[name="wall:w1"]');
    if (!wallMesh) {
      throw new Error('missing wall mesh');
    }

    const event = new MouseEvent('pointerdown', { bubbles: true });
    Object.defineProperty(event, 'point', {
      value: { x: 2.5, z: 0 },
    });

    act(() => {
      wallMesh.dispatchEvent(event);
    });

    expect(useArchitectureEditorStore.getState().wallDrag).toMatchObject({
      wallId: 'w1',
      grabOffset: [0.5, 0],
      currentOffset: [0, 0],
    });
  });
});
