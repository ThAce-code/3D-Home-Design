import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../useStore';

describe('legacy room slice removal', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  it('does not expose room collections on the app store', () => {
    const state = useStore.getState() as Record<string, unknown>;

    expect('rooms' in state).toBe(false);
    expect('selectedRoomId' in state).toBe(false);
    expect('adjacencyMap' in state).toBe(false);
  });

  it('does not expose room mutation actions on the app store', () => {
    const state = useStore.getState() as Record<string, unknown>;

    expect('addRoom' in state).toBe(false);
    expect('updateRoom' in state).toBe(false);
    expect('removeRoom' in state).toBe(false);
    expect('selectRoom' in state).toBe(false);
    expect('recalculateAdjacency' in state).toBe(false);
  });
});
