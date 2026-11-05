import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useGlobalHotkeys } from '../useGlobalHotkeys';
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
});
