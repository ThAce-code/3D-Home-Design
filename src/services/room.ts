import { v4 as uuid } from 'uuid';
import type { Room } from '../types/index.js';

const MIN_DIM = 1;
const MAX_DIM = 50;

export function createRoom(params: { width: number; depth: number; height: number; x?: number; z?: number }): Room {
  const dims = validateRoomDimensions(params);
  return {
    id: uuid(),
    x: params.x ?? 0,
    z: params.z ?? 0,
    ...dims,
    transparentWalls: {},
  };
}

export function validateRoomDimensions(d: { width: number; depth: number; height: number }) {
  return {
    width: Math.min(MAX_DIM, Math.max(MIN_DIM, d.width)),
    depth: Math.min(MAX_DIM, Math.max(MIN_DIM, d.depth)),
    height: Math.min(MAX_DIM, Math.max(MIN_DIM, d.height)),
  };
}
