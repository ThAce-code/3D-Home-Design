export type OpeningKind = 'door' | 'window';

export interface Opening {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /** Parametric position of opening center along the wall, clamped to 0–1. */
  t: number;
  width: number;
  height: number;
  sillHeight: number;
}

export const DEFAULT_DOOR_WIDTH = 0.9;
export const DEFAULT_DOOR_HEIGHT = 2.1;
export const DEFAULT_DOOR_SILL = 0;
export const DEFAULT_WINDOW_WIDTH = 1.2;
export const DEFAULT_WINDOW_HEIGHT = 1.2;
export const DEFAULT_WINDOW_SILL = 0.9;

export function createOpeningDefaults(kind: OpeningKind): Pick<Opening, 'width' | 'height' | 'sillHeight'> {
  if (kind === 'door') {
    return {
      width: DEFAULT_DOOR_WIDTH,
      height: DEFAULT_DOOR_HEIGHT,
      sillHeight: DEFAULT_DOOR_SILL,
    };
  }

  return {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    sillHeight: DEFAULT_WINDOW_SILL,
  };
}

export function clampOpeningT(t: number): number {
  if (!Number.isFinite(t)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, t));
}
