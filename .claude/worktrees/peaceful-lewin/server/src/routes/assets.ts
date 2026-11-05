import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { pool } from '../db.js';
import { validateGlb } from '../glb.js';
import {
  stagingPath, finalModelPath, finalThumbPath,
  absPath, atomicRename, cleanupStaging,
} from '../storage.js';
import { rowToAssetDto } from '../dto.js';
import { generateThumbnailAndBBox } from '../thumbnail.js';

// 查询用的 SQL
const LIST_SQL = `
  SELECT a.*, c.slug as category_slug FROM assets a
  JOIN categories c ON a.category_id = c.id
  WHERE ($1::text IS NULL OR c.slug = $1)
  ORDER BY a.created_at DESC
`;

const GET_SQL = `
  SELECT a.*, c.slug as category_slug FROM assets a
  JOIN categories c ON a.category_id = c.id
  WHERE a.id = $1
`;

export async function assetsRoutes(app: FastifyInstance): Promise<void> {

  // ========================
  // POST /api/assets — 上传
  // ========================
  app.post('/api/assets', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const uuid = randomUUID();

    try {
      // 1. 读取 fields
      const fields = data.fields as Record<string, any>;
      const nameField = fields.name;
      const categorySlugField = fields.categorySlug;

      const name = nameField?.value as string;
      const categorySlug = categorySlugField?.value as string;

      if (!name || !categorySlug) {
        // 消费 file stream
        await data.file.resume();
        return reply.code(400).send({ error: 'Missing name or categorySlug' });
      }

      // 2. 查询 category_id
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE slug = $1', [categorySlug]
      );
      if (catResult.rows.length === 0) {
        await data.file.resume();
        return reply.code(400).send({ error: `Unknown category: ${categorySlug}` });
      }
      const categoryId = catResult.rows[0].id;

      // 3. 写入 staging
      const staging = stagingPath(uuid, 'glb');
      const stagingAbs = absPath(staging);
      await pipeline(data.file, createWriteStream(stagingAbs));

      // 4. 校验 GLB header
      const validation = await validateGlb(stagingAbs);
      if (!validation.valid) {
        return reply.code(400).send({ error: `Invalid GLB: ${validation.error}` });
      }

      // 5. bbox + 缩略图（通过 Playwright 渲染）
      const stagingPng = stagingPath(uuid, 'png');
      const stagingPngAbs = absPath(stagingPng);
      const thumbResult = await generateThumbnailAndBBox(uuid, stagingPngAbs);

      if (
        !thumbResult.success
        || !thumbResult.bboxMin
        || !thumbResult.bboxSize
        || thumbResult.autoScale === undefined
      ) {
        return reply.code(500).send({ error: 'Failed to compute bounding box' });
      }

      const bboxMin = thumbResult.bboxMin;
      const bboxSize = thumbResult.bboxSize;
      const autoScale = thumbResult.autoScale;

      // 判断缩略图是否成功生成（检查文件是否存在）
      let thumbPath: string | null = null;
      try {
        await fs.stat(stagingPngAbs);
        thumbPath = finalThumbPath(uuid);
      } catch {
        thumbPath = null;
      }

      // 获取文件大小
      const stat = await fs.stat(stagingAbs);

      // 6. DB INSERT
      const filePath = finalModelPath(uuid);
      const insertResult = await pool.query(
        `INSERT INTO assets (id, name, category_id, file_path, thumb_path, file_size,
          bbox_min_x, bbox_min_y, bbox_min_z, bbox_size_x, bbox_size_y, bbox_size_z, auto_scale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [uuid, name, categoryId, filePath, thumbPath, stat.size,
         bboxMin[0], bboxMin[1], bboxMin[2], bboxSize[0], bboxSize[1], bboxSize[2], autoScale]
      );

      // 7. rename staging GLB → final
      try {
        await atomicRename(stagingAbs, absPath(filePath));
      } catch (err) {
        // 补偿：删除 DB 行
        await pool.query('DELETE FROM assets WHERE id = $1', [uuid]);
        throw err;
      }

      // 8. 如有缩略图，rename staging PNG → final
      if (thumbPath) {
        try {
          await atomicRename(stagingPngAbs, absPath(thumbPath));
        } catch (err) {
          // 补偿：更新 DB thumb_path = NULL
          await pool.query('UPDATE assets SET thumb_path = NULL WHERE id = $1', [uuid]);
          thumbPath = null;
          app.log.warn(err, 'Failed to rename thumbnail');
        }
      }

      // 9. 返回 DTO
      // 查询包含 category_slug 的完整行
      const fullRow = await pool.query(GET_SQL, [uuid]);
      return rowToAssetDto(fullRow.rows[0]);

    } finally {
      // 统一清理 staging 临时文件
      await cleanupStaging(uuid);
    }
  });

  // ========================
  // GET /api/assets — 列表
  // ========================
  app.get('/api/assets', async (request) => {
    const { category } = request.query as { category?: string };
    const { rows } = await pool.query(LIST_SQL, [category ?? null]);
    return rows.map(rowToAssetDto);
  });

  // ========================
  // GET /api/assets/:id — 详情
  // ========================
  app.get('/api/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query(GET_SQL, [id]);
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Asset not found' });
    }
    return rowToAssetDto(rows[0]);
  });

  // ========================
  // PATCH /api/assets/:id — 更新
  // ========================
  app.patch('/api/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; categorySlug?: string };

    // 检查资产是否存在
    const existing = await pool.query('SELECT id FROM assets WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }

    if (body.categorySlug !== undefined) {
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE slug = $1', [body.categorySlug]
      );
      if (catResult.rows.length === 0) {
        return reply.code(400).send({ error: `Unknown category: ${body.categorySlug}` });
      }
      updates.push(`category_id = $${paramIndex++}`);
      values.push(catResult.rows[0].id);
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' });
    }

    values.push(id);
    await pool.query(
      `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const { rows } = await pool.query(GET_SQL, [id]);
    return rowToAssetDto(rows[0]);
  });

  // ========================
  // DELETE /api/assets/:id — 删除
  // ========================
  app.delete('/api/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // 先查询文件路径
    const existing = await pool.query(
      'SELECT file_path, thumb_path FROM assets WHERE id = $1', [id]
    );
    if (existing.rows.length === 0) {
      return reply.code(404).send({ error: 'Asset not found' });
    }

    const { file_path, thumb_path } = existing.rows[0];

    // 删除 DB
    await pool.query('DELETE FROM assets WHERE id = $1', [id]);

    // 删除磁盘文件（失败记日志，不阻塞）
    try { await fs.unlink(absPath(file_path)); } catch (e) { app.log.warn(e, 'Failed to delete model file'); }
    if (thumb_path) {
      try { await fs.unlink(absPath(thumb_path)); } catch (e) { app.log.warn(e, 'Failed to delete thumbnail'); }
    }

    return reply.code(204).send();
  });
}
