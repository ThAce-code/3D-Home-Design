import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';

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
});
