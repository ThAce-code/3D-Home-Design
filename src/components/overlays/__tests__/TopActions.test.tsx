import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmptyArchitectureDocument,
  type ArchitectureDocument,
} from '../../../architecture/domain/document';
import { useArchitectureDocumentStore } from '../../../store/architectureDocumentStore';
import { useStore } from '../../../store/useStore';

const { saveStateMock, saveArchitectureDocumentMock } = vi.hoisted(() => ({
  saveStateMock: vi.fn(),
  saveArchitectureDocumentMock: vi.fn(),
}));

vi.mock('../../../services/persistence.js', () => ({
  saveState: saveStateMock,
}));

vi.mock('../../../hooks/useArchitecturePersistence.js', () => ({
  saveArchitectureDocument: saveArchitectureDocumentMock,
}));

import TopActions from '../TopActions';

function createArchitectureDocumentWithWall(): ArchitectureDocument {
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

  return document;
}

describe('TopActions', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    saveStateMock.mockReset();
    saveArchitectureDocumentMock.mockReset();
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
  });

  it('saves the architecture document instead of legacy rooms/items in architecture mode', async () => {
    const document = createArchitectureDocumentWithWall();

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      root.render(<TopActions architectureModeEnabled />);
    });

    const saveButton = mountNode.querySelector('button');

    if (!saveButton) {
      throw new Error('missing save button');
    }

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(saveArchitectureDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        wallOrder: ['w1'],
      })
    );
    expect(saveStateMock).not.toHaveBeenCalled();
  });
});
