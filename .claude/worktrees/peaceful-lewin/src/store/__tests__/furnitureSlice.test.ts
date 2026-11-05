import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('furnitureSlice', () => {
  beforeEach(() => { useStore.setState(useStore.getInitialState()); });

  it('addItem adds furniture', () => {
    useStore.getState().addItem('a1', [0,0,0], [1,1,1]);
    expect(useStore.getState().items).toHaveLength(1);
  });
  it('updateItem changes position', () => {
    useStore.getState().addItem('a1', [0,0,0], [1,1,1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().updateItem(id, { position: [5,0,5] });
    expect(useStore.getState().items[0].position).toEqual([5,0,5]);
  });
  it('removeItem deletes and deselects', () => {
    useStore.getState().addItem('a1', [0,0,0], [1,1,1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().selectItem(id);
    useStore.getState().removeItem(id);
    expect(useStore.getState().items).toHaveLength(0);
    expect(useStore.getState().selectedItemId).toBeNull();
  });
});
