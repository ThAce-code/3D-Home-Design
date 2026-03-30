import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEmptyArchitectureDocument } from '../../architecture/domain/document';
import { useGlobalHotkeys } from '../useGlobalHotkeys';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore';
import { useStore } from '../../store/useStore';

function Harness() {
  useGlobalHotkeys();
  return null;
}

describe('useGlobalHotkeys right click deselect', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);

    act(() => {
      root.render(<Harness />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    useStore.setState(useStore.getInitialState());
    useArchitectureDocumentStore.setState(useArchitectureDocumentStore.getInitialState());
    useArchitectureEditorStore.setState(useArchitectureEditorStore.getInitialState());
  });

  it('clears selection on pointerdown right click (regression)', () => {
    act(() => {
      useStore.getState().addItem('asset-1', [0, 0, 0], [1, 1, 1]);
      const id = useStore.getState().items[0]?.id;
      if (!id) {
        throw new Error('missing item id');
      }
      useStore.getState().selectItem(id);
    });

    expect(useStore.getState().selectedItemId).not.toBeNull();

    act(() => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 2 }));
    });

    expect(useStore.getState().selectedItemId).toBeNull();
  });

  it('clears selection on contextmenu (some platforms trigger this for secondary click)', () => {
    act(() => {
      useStore.getState().addItem('asset-1', [0, 0, 0], [1, 1, 1]);
      const id = useStore.getState().items[0]?.id;
      if (!id) {
        throw new Error('missing item id');
      }
      useStore.getState().selectItem(id);
      useStore.getState().selectAsset('asset-placing');
    });

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(useStore.getState().selectedItemId).toBeNull();
    expect(useStore.getState().selectedAssetId).toBeNull();
  });

  it('cancels an in-progress architecture wall draft on right click', () => {
    act(() => {
      useArchitectureEditorStore.getState().setActiveTool('wall');
      useArchitectureEditorStore.getState().startDraftWall([0, 0], null);
      useArchitectureEditorStore.getState().updateDraftWall([4, 0], null);
    });

    expect(useArchitectureEditorStore.getState().draftWall).not.toBeNull();

    act(() => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 2 }));
    });

    expect(useArchitectureEditorStore.getState().draftWall).toBeNull();
  });

  it('deletes the selected architecture wall with the Delete key', () => {
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

    act(() => {
      useArchitectureDocumentStore.getState().replaceDocument(document);
      useArchitectureEditorStore.getState().setSelection({
        vertexIds: [],
        wallIds: ['w1'],
        zoneIds: [],
      });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });

    expect(useArchitectureDocumentStore.getState().document.wallOrder).toHaveLength(0);
    expect(useArchitectureEditorStore.getState().selection.wallIds).toEqual([]);
  });
});
