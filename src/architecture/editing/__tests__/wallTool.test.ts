import { describe, expect, it } from 'vitest';
import {
  armWallTool,
  createDefaultWallDraftConstraintState,
  createDefaultWallToolState,
  previewWallClosure,
  setWallNumericEntryEnabled,
  updateWallToolModifiers,
} from '../wallTool';

describe('wallTool', () => {
  it('starts idle with unconstrained defaults', () => {
    expect(createDefaultWallToolState()).toEqual({
      mode: 'idle',
      modifiers: {
        shiftKey: false,
        altKey: false,
      },
      constraints: createDefaultWallDraftConstraintState(),
    });
  });

  it('arms wall drafting and enters axis lock while Shift is held', () => {
    const armed = armWallTool(createDefaultWallToolState());
    const locked = updateWallToolModifiers(armed, { shiftKey: true });

    expect(locked.mode).toBe('axis-locked');
    expect(locked.modifiers.shiftKey).toBe(true);
    expect(locked.constraints.axisLock).toBe('pending');
  });

  it('bypasses snapping while Alt is held', () => {
    const armed = armWallTool(createDefaultWallToolState());
    const bypassed = updateWallToolModifiers(armed, { altKey: true });

    expect(bypassed.modifiers.altKey).toBe(true);
    expect(bypassed.constraints.snapBypassed).toBe(true);
    expect(bypassed.constraints.snapEnabled).toBe(false);
  });

  it('enters numeric entry mode when Tab is requested', () => {
    const armed = armWallTool(createDefaultWallToolState());
    const numericEntry = setWallNumericEntryEnabled(armed, true);

    expect(numericEntry.mode).toBe('numeric-entry');
    expect(numericEntry.constraints.numericEntryEnabled).toBe(true);
  });

  it('stores closure preview metadata for an explicit close candidate', () => {
    const armed = armWallTool(createDefaultWallToolState());
    const preview = previewWallClosure(armed, {
      vertexId: 'vertex-close',
      point: [4, 3],
    });

    expect(preview.mode).toBe('closure-preview');
    expect(preview.constraints.closureCandidateVertexId).toBe('vertex-close');
    expect(preview.constraints.closureCandidatePoint).toEqual([4, 3]);
  });
});
