import type { StateCreator } from 'zustand';
import { createRoom } from '../../services/room.js';
import { computeAdjacency, type AdjacencyMap } from '../../services/adjacency.js';
import type { Room } from '../../types/room.js';

export interface RoomSlice {
  rooms: Room[];
  selectedRoomId: string | null;
  adjacencyMap: AdjacencyMap;
  addRoom: (params: { width: number; depth: number; height: number; x?: number; z?: number }) => void;
  updateRoom: (id: string, patch: Partial<Pick<Room, 'width' | 'depth' | 'height' | 'x' | 'z' | 'transparentWalls'>>) => void;
  removeRoom: (id: string) => void;
  selectRoom: (id: string | null) => void;
  recalculateAdjacency: () => void;
}

function recalcAdjacency(s: { rooms: Room[]; adjacencyMap: AdjacencyMap }) {
  s.adjacencyMap = computeAdjacency(s.rooms);
}

export const createRoomSlice: StateCreator<RoomSlice, [['zustand/immer', never]], [], RoomSlice> = (set) => ({
  rooms: [],
  selectedRoomId: null,
  adjacencyMap: {},
  addRoom: (params) => set((s) => {
    const room = createRoom(params);
    s.rooms.push(room);
    s.selectedRoomId = room.id;
    recalcAdjacency(s);
  }),
  updateRoom: (id, patch) => set((s) => {
    const room = s.rooms.find((r) => r.id === id);
    if (!room) return;
    const needsRecalc = 'x' in patch || 'z' in patch || 'width' in patch || 'depth' in patch;
    Object.assign(room, patch);
    if (needsRecalc) recalcAdjacency(s);
  }),
  removeRoom: (id) => set((s) => {
    s.rooms = s.rooms.filter((r) => r.id !== id);
    if (s.selectedRoomId === id) s.selectedRoomId = null;
    recalcAdjacency(s);
  }),
  selectRoom: (id) => set((s) => { s.selectedRoomId = id; }),
  recalculateAdjacency: () => set((s) => { recalcAdjacency(s); }),
});
