import type { Point2 } from '../topology/math.js';

export type ArchitectureTool = 'select' | 'wall' | 'pan' | 'delete';

export interface DraftWallState {
  startPoint: Point2;
  currentPoint: Point2;
  snappedVertexId: string | null;
}

export interface ArchitectureSelection {
  vertexIds: string[];
  wallIds: string[];
  zoneIds: string[];
}

export interface ArchitectureHover {
  vertexId: string | null;
  wallId: string | null;
  zoneId: string | null;
}

export interface ArchitectureViewportState {
  gridSize: number;
  snapEnabled: boolean;
  snapTolerance: number;
}

export const DEFAULT_ARCHITECTURE_TOOL: ArchitectureTool = 'select';
export const DEFAULT_GRID_SIZE = 1;
export const DEFAULT_SNAP_TOLERANCE = 0.05;

export function createEmptySelection(): ArchitectureSelection {
  return {
    vertexIds: [],
    wallIds: [],
    zoneIds: [],
  };
}

export function createEmptyHover(): ArchitectureHover {
  return {
    vertexId: null,
    wallId: null,
    zoneId: null,
  };
}

export function createDefaultViewport(): ArchitectureViewportState {
  return {
    gridSize: DEFAULT_GRID_SIZE,
    snapEnabled: true,
    snapTolerance: DEFAULT_SNAP_TOLERANCE,
  };
}
