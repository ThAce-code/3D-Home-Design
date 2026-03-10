export interface Asset {
  id: string;
  name: string;
  categorySlug: string;
  modelUrl: string;
  thumbUrl: string | null;
  fileSize: number;
  bboxMin: [number, number, number];
  bboxSize: [number, number, number];
  autoScale: number;
}

export interface FurnitureItem {
  id: string;
  assetId: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
  baseSize?: [number, number, number];
}
