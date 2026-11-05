interface AssetRow {
  id: string;
  name: string;
  category_slug: string;
  file_path: string;
  thumb_path: string | null;
  file_size: string; // bigint from pg
  bbox_min_x: number;
  bbox_min_y: number;
  bbox_min_z: number;
  bbox_size_x: number;
  bbox_size_y: number;
  bbox_size_z: number;
  auto_scale: number;
  created_at: string;
  updated_at: string;
}

export interface AssetDto {
  id: string;
  name: string;
  categorySlug: string;
  modelUrl: string;
  thumbUrl: string | null;
  fileSize: number;
  bboxMin: [number, number, number];
  bboxSize: [number, number, number];
  autoScale: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 路径约定：DB 的 file_path/thumb_path 存不带前导斜杠的相对路径
 * （如 models/{uuid}.glb），rowToAssetDto 负责拼 /uploads/ 前缀
 */
export function rowToAssetDto(row: AssetRow): AssetDto {
  return {
    id: row.id,
    name: row.name,
    categorySlug: row.category_slug,
    modelUrl: `/uploads/${row.file_path}`,
    thumbUrl: row.thumb_path ? `/uploads/${row.thumb_path}` : null,
    fileSize: Number(row.file_size),
    bboxMin: [row.bbox_min_x, row.bbox_min_y, row.bbox_min_z],
    bboxSize: [row.bbox_size_x, row.bbox_size_y, row.bbox_size_z],
    autoScale: row.auto_scale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
