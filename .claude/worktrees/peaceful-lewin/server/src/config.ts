import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 3001),
  uploadsDir: path.resolve(__dirname, '../uploads'),
  dbUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/home_design',
};
