import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { createRoomSlice, type RoomSlice } from './slices/roomSlice.js';
import { createFurnitureSlice, type FurnitureSlice } from './slices/furnitureSlice.js';
import { createAssetSlice, type AssetSlice } from './slices/assetSlice.js';
import { createCameraSlice, type CameraSlice } from './slices/cameraSlice.js';
import { createUiSlice, type UiSlice } from './slices/uiSlice.js';

export type AppState = RoomSlice & FurnitureSlice & AssetSlice & CameraSlice & UiSlice;

export const useStore = create<AppState>()(
  temporal(
    immer((...a) => ({
      ...createRoomSlice(...a),
      ...createFurnitureSlice(...a),
      ...createAssetSlice(...a),
      ...createCameraSlice(...a),
      ...createUiSlice(...a),
    })),
    {
      partialize: (state) => ({
        rooms: state.rooms,
        items: state.items,
      }) as AppState,
    }
  )
);
