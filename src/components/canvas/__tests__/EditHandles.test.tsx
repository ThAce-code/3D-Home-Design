import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../../store/architectureEditorStore';
import EditHandles from '../EditHandles';

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

describe('EditHandles', () => {
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

  it('renders endpoint handles when a wall is selected', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<EditHandles />);
    });

    expect(mountNode.querySelector('[data-testid="handle:vertex:v1"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="handle:vertex:v2"]')).not.toBeNull();
  });

  it('renders no handles without a selection', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      root.render(<EditHandles />);
    });

    expect(mountNode.querySelector('[name^="edit-handle:"]')).toBeNull();
  });

  it('renders no handles outside the select tool', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<EditHandles />);
    });

    expect(mountNode.querySelector('[name^="edit-handle:"]')).toBeNull();
  });

  it('starts a vertex drag from pointer down on a handle', () => {
    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(createDocumentWithWall());
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
      root.render(<EditHandles />);
    });

    const handle = mountNode.querySelector('[data-testid="handle:vertex:v1"]');
    if (!handle) {
      throw new Error('missing edit handle');
    }

    act(() => {
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(useArchitectureEditorStore.getState().vertexDrag).toMatchObject({
      vertexId: 'v1',
      startPosition: [0, 0],
      currentPosition: [0, 0],
    });
  });
});
