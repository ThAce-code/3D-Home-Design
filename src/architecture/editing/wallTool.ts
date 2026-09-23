import type { Point2 } from '../topology/math.js';

export type WallToolMode =
  | 'idle'
  | 'armed'
  | 'axis-locked'
  | 'numeric-entry'
  | 'closure-preview';

export type WallToolAxisLock = 'free' | 'pending' | 'horizontal' | 'vertical';

export interface WallClosurePreviewCandidate {
  vertexId: string;
  point: Point2;
}

export interface WallDraftConstraintState {
  axisLock: WallToolAxisLock;
  snapEnabled: boolean;
  snapBypassed: boolean;
  numericEntryEnabled: boolean;
  closureCandidateVertexId: string | null;
  closureCandidatePoint: Point2 | null;
}

export interface WallToolState {
  mode: WallToolMode;
  modifiers: {
    shiftKey: boolean;
    altKey: boolean;
  };
  constraints: WallDraftConstraintState;
}

export function createDefaultWallDraftConstraintState(): WallDraftConstraintState {
  return {
    axisLock: 'free',
    snapEnabled: true,
    snapBypassed: false,
    numericEntryEnabled: false,
    closureCandidateVertexId: null,
    closureCandidatePoint: null,
  };
}

export function createDefaultWallToolState(): WallToolState {
  return {
    mode: 'idle',
    modifiers: {
      shiftKey: false,
      altKey: false,
    },
    constraints: createDefaultWallDraftConstraintState(),
  };
}

export function armWallTool(state: WallToolState): WallToolState {
  return {
    ...state,
    mode: resolveWallToolMode({
      ...state,
      mode: 'armed',
    }),
  };
}

export function updateWallToolModifiers(
  state: WallToolState,
  modifiers: Partial<WallToolState['modifiers']>,
): WallToolState {
  const next: WallToolState = {
    ...state,
    modifiers: {
      ...state.modifiers,
      ...modifiers,
    },
    constraints: {
      ...state.constraints,
      axisLock: modifiers.shiftKey === true
        ? 'pending'
        : modifiers.shiftKey === false
          ? 'free'
          : state.constraints.axisLock,
      snapBypassed: modifiers.altKey ?? state.modifiers.altKey,
      snapEnabled: !(modifiers.altKey ?? state.modifiers.altKey),
    },
  };

  return {
    ...next,
    mode: resolveWallToolMode(next),
  };
}

export function setWallNumericEntryEnabled(
  state: WallToolState,
  numericEntryEnabled: boolean,
): WallToolState {
  const next: WallToolState = {
    ...state,
    constraints: {
      ...state.constraints,
      numericEntryEnabled,
    },
  };

  return {
    ...next,
    mode: resolveWallToolMode(next),
  };
}

export function previewWallClosure(
  state: WallToolState,
  candidate: WallClosurePreviewCandidate | null,
): WallToolState {
  const next: WallToolState = {
    ...state,
    constraints: {
      ...state.constraints,
      closureCandidateVertexId: candidate?.vertexId ?? null,
      closureCandidatePoint: candidate?.point ?? null,
    },
  };

  return {
    ...next,
    mode: resolveWallToolMode(next),
  };
}

function resolveWallToolMode(state: WallToolState): WallToolMode {
  if (state.constraints.numericEntryEnabled) {
    return 'numeric-entry';
  }

  if (state.constraints.closureCandidateVertexId) {
    return 'closure-preview';
  }

  if (state.modifiers.shiftKey) {
    return 'axis-locked';
  }

  if (state.mode === 'idle') {
    return 'idle';
  }

  return 'armed';
}
