import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagingPath, absPath } from '../storage.js';

function isSafeRelativePath(relPath: string): boolean {
  if (!relPath) return false;
  if (relPath.includes('\\')) return false;
  if (relPath.startsWith('/')) return false;
  const normalized = path.posix.normalize(relPath);
  return normalized !== '..' && !normalized.startsWith('../') && !normalized.includes('/../');
}

function jsContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.wasm':
      return 'application/wasm';
    default:
      return 'application/octet-stream';
  }
}

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  const routesDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(routesDir, '../../../');
  const threeRoot = path.join(repoRoot, 'node_modules', 'three');
  const threeBuildRoot = path.join(threeRoot, 'build');
  const threeAddonsRoot = path.join(threeRoot, 'examples', 'jsm');

  app.get('/__thumb/vendor/three/build/*', async (request, reply) => {
    const rel = (request.params as { '*': string })['*'];
    if (!isSafeRelativePath(rel)) {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    const resolved = path.resolve(threeBuildRoot, rel);
    const rootResolved = path.resolve(threeBuildRoot) + path.sep;
    if (!resolved.toLowerCase().startsWith(rootResolved.toLowerCase())) {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    try {
      await fsp.access(resolved);
    } catch {
      return reply.code(404).send({ error: 'File not found' });
    }

    const stream = fs.createReadStream(resolved);
    return reply.type(jsContentType(resolved)).send(stream);
  });

  app.get('/__thumb/vendor/three/addons/*', async (request, reply) => {
    const rel = (request.params as { '*': string })['*'];
    if (!isSafeRelativePath(rel)) {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    const resolved = path.resolve(threeAddonsRoot, rel);
    const rootResolved = path.resolve(threeAddonsRoot) + path.sep;
    if (!resolved.toLowerCase().startsWith(rootResolved.toLowerCase())) {
      return reply.code(400).send({ error: 'Invalid path' });
    }

    try {
      await fsp.access(resolved);
    } catch {
      return reply.code(404).send({ error: 'File not found' });
    }

    const stream = fs.createReadStream(resolved);
    return reply.type(jsContentType(resolved)).send(stream);
  });

  // GET /__thumb/model/:uuid — 从 .staging 目录读取 GLB 文件返回
  // 仅供缩略图生成服务内部使用
  app.get('/__thumb/model/:uuid', async (request, reply) => {
    const { uuid } = request.params as { uuid: string };
    // 安全校验：uuid 格式
    if (!/^[a-f0-9-]{36}$/.test(uuid)) {
      return reply.code(400).send({ error: 'Invalid uuid' });
    }
    const staging = stagingPath(uuid, 'glb');
    const filePath = absPath(staging);
    try {
      await fsp.access(filePath);
    } catch {
      return reply.code(404).send({ error: 'Staging file not found' });
    }
    const stream = fs.createReadStream(filePath);
    return reply.type('model/gltf-binary').send(stream);
  });

  // GET /__thumb/viewer — serve thumbnail-viewer.html
  app.get('/__thumb/viewer', async (_request, reply) => {
    const viewerPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../thumbnail-viewer.html',
    );
    const html = await fsp.readFile(viewerPath, 'utf-8');
    return reply.type('text/html').send(html);
  });
}
