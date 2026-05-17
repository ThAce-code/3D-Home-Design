import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import { editorTheme } from '../../../theme/editorTheme';

const moveToSpy = vi.fn();
const lineToSpy = vi.fn();
const closePathSpy = vi.fn();
const buildZoneMeshDescriptorsMock = vi.fn();

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

vi.mock('../../../architecture/geometry/zoneMeshes', () => ({
  buildZoneMeshDescriptors: (...args: unknown[]) => buildZoneMeshDescriptorsMock(...args),
}));

import ZoneMeshes from '../ZoneMeshes';

describe('ZoneMeshes', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    moveToSpy.mockClear();
    lineToSpy.mockClear();
    closePathSpy.mockClear();
    buildZoneMeshDescriptorsMock.mockReset();
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

  it('uses the selected zone material color for the selected zone', () => {
    buildZoneMeshDescriptorsMock.mockReturnValue([
      {
        zoneId: 'z-selected',
        position: [0, 0.001, 0],
        rotation: [-Math.PI / 2, 0, 0],
        shapePoints: [
          [0, 0],
          [4, 0],
          [4, 3],
          [0, 3],
        ],
      },
    ]);

    act(() => {
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: [],
        zoneIds: ['z-selected'],
      });
      root.render(<ZoneMeshes />);
    });

    const material = mountNode.querySelector('[name="zone:z-selected"] meshstandardmaterial');

    expect(material?.getAttribute('color')).toBe(editorTheme.selected);
    expect(material?.getAttribute('opacity')).toBe('0.5');
  });
});
