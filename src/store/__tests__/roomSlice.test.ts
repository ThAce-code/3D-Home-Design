import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('roomSlice', () => {
  beforeEach(() => { useStore.setState(useStore.getInitialState()); });

  it('starts with empty rooms', () => {
    expect(useStore.getState().rooms).toEqual([]);
  });
  it('addRoom adds a room', () => {
    useStore.getState().addRoom({ width: 5, depth: 4, height: 3 });
    expect(useStore.getState().rooms).toHaveLength(1);
    expect(useStore.getState().rooms[0].width).toBe(5);
  });
  it('updateRoom modifies room', () => {
    useStore.getState().addRoom({ width: 5, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().updateRoom(id, { width: 8 });
    expect(useStore.getState().rooms[0].width).toBe(8);
  });
  it('removeRoom deletes room', () => {
    useStore.getState().addRoom({ width: 5, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().removeRoom(id);
    expect(useStore.getState().rooms).toHaveLength(0);
  });
  it('selectRoom sets selectedRoomId', () => {
    useStore.getState().addRoom({ width: 5, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().selectRoom(id);
    expect(useStore.getState().selectedRoomId).toBe(id);
  });
});
