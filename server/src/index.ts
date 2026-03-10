import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { ensureDirs } from './storage.js';
import { categoriesRoutes } from './routes/categories.js';
import { assetsRoutes } from './routes/assets.js';
import { internalRoutes } from './routes/internal.js';
import { initBrowser, closeBrowser } from './thumbnail.js';

const app = Fastify({ logger: true });

// Multipart — GLB 上传，限制 50MB
app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 3, parts: 4 },
});

// 静态文件服务 — 挂载 /uploads 前缀，提供 GLB 模型和缩略图
app.register(fastifyStatic, {
  root: config.uploadsDir,
  prefix: '/uploads/',
  dotfiles: 'deny',
  maxAge: '30d',
  immutable: true,
  allowedPath: (pathName: string) => {
    return /^\/models\/[a-f0-9-]+\.glb$/.test(pathName)
        || /^\/thumbnails\/[a-f0-9-]+\.png$/.test(pathName);
  },
});

app.register(categoriesRoutes);
app.register(assetsRoutes);
app.register(internalRoutes);

// 启动前确保上传目录存在 & 初始化 Playwright 浏览器
app.addHook('onReady', async () => { await ensureDirs(); });
app.addHook('onReady', async () => { await initBrowser(); });
app.addHook('onClose', async () => { await closeBrowser(); });

app.listen({ port: config.port, host: '0.0.0.0' });
