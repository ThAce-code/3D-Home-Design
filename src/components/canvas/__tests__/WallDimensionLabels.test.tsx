import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import WallDimensionLabels from '../WallDimensionLabels';

vi.mock('@react-three/drei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/drei')>();

  return {
    ...actual,
    Html: ({ children, position }: { children: React.ReactNode; position: [number, number, number] }) => (
      <div data-html-position={position.join(',')}>{children}</div>
    ),
  };
});

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

describe('WallDimensionLabels', () => {
  let mountNode: HTMLDivElement;
  let root: Root;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
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

  it('shows the selected wall length', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<WallDimensionLabels />);
    });

    expect(mountNode.querySelector('[data-testid="wall-dimension-label:w1"]')?.textContent).toBe('4.00 m');
  });

  it('updates the label using the current drag position', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      useArchitectureEditorStore.getState().startVertexDrag('v2', [4, 0]);
      useArchitectureEditorStore.getState().updateVertexDrag([3, 4], null);
      root.render(<WallDimensionLabels />);
    });

    expect(mountNode.querySelector('[data-testid="wall-dimension-label:w1"]')?.textContent).toBe('5.00 m');
  });
});
