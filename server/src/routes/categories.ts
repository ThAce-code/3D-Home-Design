import { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

export async function categoriesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/categories', async () => {
    const { rows } = await pool.query('SELECT id, name, slug FROM categories ORDER BY id');
    return rows;
  });
}
