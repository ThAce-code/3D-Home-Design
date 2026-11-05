import type { StateCreator } from 'zustand';
import type { Asset } from '../../types/furniture.js';
import type { Category } from '../../services/api.js';
import * as api from '../../services/api.js';

export interface AssetSlice {
  assets: Asset[];
  categories: Category[];
  selectedAssetId: string | null;
  assetsLoading: boolean;
  uploadStatus: 'idle' | 'uploading' | 'error';

  loadCategories: () => Promise<void>;
  loadAssets: (category?: string) => Promise<void>;
  uploadAsset: (file: File, name: string, categorySlug: string) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  selectAsset: (id: string | null) => void;
}

export const createAssetSlice: StateCreator<AssetSlice, [['zustand/immer', never]], [], AssetSlice> = (set) => ({
  assets: [],
  categories: [],
  selectedAssetId: null,
  assetsLoading: false,
  uploadStatus: 'idle',

  loadCategories: async () => {
    const categories = await api.fetchCategories();
    set((s) => { s.categories = categories; });
  },

  loadAssets: async (category) => {
    set((s) => { s.assetsLoading = true; });
    try {
      const assets = await api.fetchAssets(category);
      set((s) => { s.assets = assets; s.assetsLoading = false; });
    } catch {
      set((s) => { s.assetsLoading = false; });
    }
  },

  uploadAsset: async (file, name, categorySlug) => {
    set((s) => { s.uploadStatus = 'uploading'; });
    try {
      const asset = await api.uploadAsset(file, name, categorySlug);
      set((s) => { s.assets.push(asset); s.uploadStatus = 'idle'; });
    } catch {
      set((s) => { s.uploadStatus = 'error'; });
    }
  },

  removeAsset: async (id) => {
    await api.deleteAsset(id);
    set((s) => {
      s.assets = s.assets.filter((a) => a.id !== id);
      if (s.selectedAssetId === id) s.selectedAssetId = null;
    });
  },

  selectAsset: (id) => set((s) => { s.selectedAssetId = id; }),
});
