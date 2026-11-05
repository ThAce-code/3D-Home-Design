import type { Room } from '../types/room.js';

const EPS = 1e-4;

export type WallOverlap = { min: number; max: number };

export type RoomAdjacency = {
  north: WallOverlap[];
  south: WallOverlap[];
  east: WallOverlap[];
  west: WallOverlap[];
};

export type AdjacencyMap = Record<string, RoomAdjacency>;

/** Sort by min then merge overlapping / touching intervals. */
export function mergeOverlaps(overlaps: WallOverlap[]): WallOverlap[] {
  if (overlaps.length === 0) return [];
  const sorted = [...overlaps].sort((a, b) => a.min - b.min);
  const merged: WallOverlap[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].min <= last.max + EPS) {
      last.max = Math.max(last.max, sorted[i].max);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged.filter((o) => o.max - o.min > EPS);
}

/** Subtract sorted+merged overlaps from [fullMin, fullMax], return visible segments. */
export function subtractSegments(
  fullMin: number,
  fullMax: number,
  overlaps: WallOverlap[],
): WallOverlap[] {
  if (overlaps.length === 0) return [{ min: fullMin, max: fullMax }];
  const result: WallOverlap[] = [];
  let cursor = fullMin;
  for (const o of overlaps) {
    const start = Math.max(o.min, fullMin);
    const end = Math.min(o.max, fullMax);
    if (start > cursor + EPS) {
      result.push({ min: cursor, max: start });
    }
    cursor = Math.max(cursor, end);
  }
  if (fullMax > cursor + EPS) {
    result.push({ min: cursor, max: fullMax });
  }
  return result.filter((s) => s.max - s.min > EPS);
}

function emptyAdj(): RoomAdjacency {
  return { north: [], south: [], east: [], west: [] };
}

/** Compute overlap interval along a shared axis between two ranges. */
function overlapRange(
  aMin: number, aMax: number,
  bMin: number, bMax: number,
): { min: number; max: number } | null {
  const lo = Math.max(aMin, bMin);
  const hi = Math.min(aMax, bMax);
  if (hi - lo <= EPS) return null;
  return { min: lo, max: hi };
}

/**
 * Compute adjacency map for all rooms.
 * For each pair of rooms, check if they share a wall edge and compute overlap intervals.
 * Overlaps are stored in local coordinates relative to each room.
 */
export function computeAdjacency(rooms: Room[]): AdjacencyMap {
  const map: AdjacencyMap = {};
  for (const r of rooms) {
    map[r.id] = emptyAdj();
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      const aLeft = a.x - a.width / 2;
      const aRight = a.x + a.width / 2;
      const aFront = a.z + a.depth / 2; // south (positive Z)
      const aBack = a.z - a.depth / 2;  // north (negative Z)

      const bLeft = b.x - b.width / 2;
      const bRight = b.x + b.width / 2;
      const bFront = b.z + b.depth / 2;
      const bBack = b.z - b.depth / 2;

      // A.east ↔ B.west: A's right edge meets B's left edge
      if (Math.abs(aRight - bLeft) < EPS) {
        // Overlap along Z axis
        const ov = overlapRange(aBack, aFront, bBack, bFront);
        if (ov) {
          // Local coords: east/west walls span along Z, local = world_z - room.z
          map[a.id].east.push({ min: ov.min - a.z, max: ov.max - a.z });
          map[b.id].west.push({ min: ov.min - b.z, max: ov.max - b.z });
        }
      }

      // A.west ↔ B.east: A's left edge meets B's right edge
      if (Math.abs(aLeft - bRight) < EPS) {
        const ov = overlapRange(aBack, aFront, bBack, bFront);
        if (ov) {
          map[a.id].west.push({ min: ov.min - a.z, max: ov.max - a.z });
          map[b.id].east.push({ min: ov.min - b.z, max: ov.max - b.z });
        }
      }

      // A.north ↔ B.south: A's back edge meets B's front edge
      if (Math.abs(aBack - bFront) < EPS) {
        // Overlap along X axis
        const ov = overlapRange(aLeft, aRight, bLeft, bRight);
        if (ov) {
          // Local coords: north/south walls span along X, local = world_x - room.x
          map[a.id].north.push({ min: ov.min - a.x, max: ov.max - a.x });
          map[b.id].south.push({ min: ov.min - b.x, max: ov.max - b.x });
        }
      }

      // A.south ↔ B.north: A's front edge meets B's back edge
      if (Math.abs(aFront - bBack) < EPS) {
        const ov = overlapRange(aLeft, aRight, bLeft, bRight);
        if (ov) {
          map[a.id].south.push({ min: ov.min - a.x, max: ov.max - a.x });
          map[b.id].north.push({ min: ov.min - b.x, max: ov.max - b.x });
        }
      }
    }
  }

  // Sort + merge overlaps for each room/direction
  for (const id of Object.keys(map)) {
    const adj = map[id];
    adj.north = mergeOverlaps(adj.north);
    adj.south = mergeOverlaps(adj.south);
    adj.east = mergeOverlaps(adj.east);
    adj.west = mergeOverlaps(adj.west);
  }

  return map;
}
