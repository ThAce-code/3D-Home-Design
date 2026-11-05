import type { StateCreator } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { FurnitureItem } from '../../types/furniture.js';

export interface FurnitureSlice {
  items: FurnitureItem[];
  selectedItemId: string | null;
  addItem: (assetId: string, position: [number,number,number], scale: [number,number,number], baseSize?: [number,number,number]) => void;
  updateItem: (id: string, patch: Partial<Pick<FurnitureItem, 'position' | 'quaternion' | 'scale'>>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
}

export const createFurnitureSlice: StateCreator<FurnitureSlice, [['zustand/immer', never]], [], FurnitureSlice> = (set) => ({
  items: [],
  selectedItemId: null,
  addItem: (assetId, position, scale, baseSize) => set((s) => {
    s.items.push({ id: uuid(), assetId, position, quaternion: [0,0,0,1], scale, baseSize });
  }),
  updateItem: (id, patch) => set((s) => {
    const item = s.items.find((i) => i.id === id);
    if (item) Object.assign(item, patch);
  }),
  removeItem: (id) => set((s) => {
    s.items = s.items.filter((i) => i.id !== id);
    if (s.selectedItemId === id) s.selectedItemId = null;
  }),
  selectItem: (id) => set((s) => { s.selectedItemId = id; }),
});
