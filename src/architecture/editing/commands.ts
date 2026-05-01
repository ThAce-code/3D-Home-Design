import type { Wall } from '../domain/wall.js';
import type { Zone } from '../domain/zone.js';
import type { Point2 } from '../topology/math.js';

// V1 commands operate on a wall graph whose derived zones currently come only
// from disconnected simple loops. Shared-wall or final face extraction is out
// of scope until the topology pipeline is upgraded.
export type ArchitectureCommand =
  | { type: 'DRAW_WALL'; start: Point2; end: Point2 }
  | { type: 'MOVE_VERTEX'; vertexId: string; to: Point2 }
  | { type: 'DELETE_WALL'; wallId: string }
  | { type: 'DELETE_ZONE'; zoneId: string }
  | { type: 'DELETE_VERTEX'; vertexId: string }
  | {
    type: 'SET_WALL_PROPS';
    wallId: string;
    patch: Partial<Pick<Wall, 'thickness' | 'height' | 'kind'>>;
  }
  | {
    type: 'SET_ZONE_PROPS';
    zoneId: string;
    patch: Partial<Pick<Zone, 'kind' | 'name'>>;
  };
