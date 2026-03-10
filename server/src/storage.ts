import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const STAGING_DIR = '.staging';
const MODELS_DIR = 'models';
const THUMBNAILS_DIR = 'thumbnails';

/** 确保 uploads 子目录存在 */
export async function ensureDirs(): Promise<void> {
  const dirs = [STAGING_DIR, MODELS_DIR, THUMBNAILS_DIR];
  for (const dir of dirs) {
    await fs.mkdir(path.join(config.uploadsDir, dir), { recursive: true });
  }
}

/** staging 临时文件路径（不带前导斜杠的相对路径） */
export function stagingPath(uuid: string, ext: string): string {
  return `${STAGING_DIR}/tmp_${uuid}.${ext}`;
}

/** 最终模型路径（不带前导斜杠的相对路径，如 models/{uuid}.glb） */
export function finalModelPath(uuid: string): string {
  return `${MODELS_DIR}/${uuid}.glb`;
}

/** 最终缩略图路径（不带前导斜杠的相对路径，如 thumbnails/{uuid}.png） */
export function finalThumbPath(uuid: string): string {
  return `${THUMBNAILS_DIR}/${uuid}.png`;
}

/** 将相对路径转为绝对路径 */
export function absPath(relativePath: string): string {
  return path.join(config.uploadsDir, relativePath);
}

/** 原子 rename */
export async function atomicRename(src: string, dest: string): Promise<void> {
  await fs.rename(src, dest);
}

/** 清理 staging 中该 uuid 的所有临时文件 */
export async function cleanupStaging(uuid: string): Promise<void> {
  const stagingDir = path.join(config.uploadsDir, STAGING_DIR);
  const prefix = `tmp_${uuid}`;
  try {
    const entries = await fs.readdir(stagingDir);
    for (const entry of entries) {
      if (entry.startsWith(prefix)) {
        await fs.unlink(path.join(stagingDir, entry)).catch(() => {});
      }
    }
  } catch {
    // staging 目录不存在或其他错误，忽略
  }
}
