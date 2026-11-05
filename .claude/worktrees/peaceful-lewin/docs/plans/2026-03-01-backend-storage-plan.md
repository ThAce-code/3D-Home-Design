# 资产库后端实施计划

> 设计文档：`docs/plans/2026-03-01-asset-library-backend-design.md`

## 步骤总览

1. 后端项目初始化（server/ 目录、依赖、tsconfig、启动脚本）
2. 数据库 schema 迁移脚本 + 连接池
3. 文件存储目录结构 + GLB 校验工具
4. API 路由：categories 列表查询
5. API 路由：assets 上传（multipart + staging + rename + 补偿）
6. API 路由：assets 查询/更新/删除
7. @fastify/static 静态文件服务
8. Playwright 缩略图生成服务
9. 前端：Asset 类型 + API client
10. 前端：assetSlice 改造（API 驱动）
11. 前端：AssetPanel 改造（缩略图 + 分类筛选）
12. 前端：FurnitureModel / GhostPreview 迁移
13. Vite proxy 配置 + persistence.ts 清理
14. 集成测试

---

## 步骤 1：后端项目初始化

### 目标
创建 `server/` 目录，独立的 Node.js + TypeScript 项目，Fastify 入口。

### 要改的文件
- 新建 `server/package.json`
- 新建 `server/tsconfig.json`
- 新建 `server/src/index.ts`（Fastify 入口）
- 新建 `server/src/config.ts`（端口、uploads 路径等配置）
- 修改根 `package.json`：添加 `dev:server` 脚本

### 详细说明

`server/package.json`：
- `"type": "module"`
- 依赖：`fastify`, `@fastify/multipart`, `@fastify/static`, `@fastify/cors`, `pg`（node-postgres）, `uuid`
- devDependencies：`typescript`, `@types/node`, `@types/pg`, `tsx`
- scripts：`"dev": "tsx watch src/index.ts"`, `"build": "tsc"`

`server/tsconfig.json`：
- `target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`
- `outDir: "./dist"`, `rootDir: "./src"`, `strict: true`

`server/src/index.ts`：
```ts
import Fastify from 'fastify';
import { config } from './config.js';
// 后续步骤注册路由插件

const app = Fastify({ logger: true });
app.listen({ port: config.port, host: '0.0.0.0' });
```

`server/src/config.ts`：
```ts
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 3001),
  uploadsDir: path.resolve(__dirname, '../uploads'),
  dbUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/home_design',
};
```
> 注意：不使用 `import.meta.dirname`（在 Node ESM/TS 下不一定可用），改用 `fileURLToPath(import.meta.url) + path.dirname` 确保兼容性。

根 `package.json` 添加：
```json
"dev:server": "npm --prefix server run dev"
```

### 验证
- `cd server && npm install && npm run dev` 启动成功，监听 3001 端口
- `curl http://localhost:3001/` 返回 404（无路由）

---

## 步骤 2：数据库 schema 迁移 + 连接池

### 目标
SQL 迁移脚本创建 categories + assets 表；封装 pg 连接池。

### 要改的文件
- 新建 `server/src/db.ts`（连接池）
- 新建 `server/migrations/001-init.sql`

### 详细说明

`server/src/db.ts`：
```ts
import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.dbUrl });
```

`server/migrations/001-init.sql`：
- 完整 SQL 来自设计文档 §1（pgcrypto、categories、assets、触发器、索引）
- 幂等：`CREATE EXTENSION IF NOT EXISTS`、`INSERT ... ON CONFLICT DO NOTHING`

根 `package.json` 添加：
```json
"db:migrate": "cd server && psql $DATABASE_URL -f migrations/001-init.sql"
```

### 验证
- 执行迁移脚本后，`\dt` 显示 categories 和 assets 表
- `SELECT * FROM categories` 返回 8 条预置分类

---

## 步骤 3：文件存储目录 + GLB header 校验

### 目标
确保 uploads 目录结构存在；实现 GLB header 校验工具（仅校验 header，不解析 bbox）。

### 要改的文件
- 新建 `server/src/storage.ts`（目录初始化 + rename 辅助）
- 新建 `server/src/glb.ts`（GLB header 校验，**不含** bbox 解析）

### 详细说明

`server/src/storage.ts`：
```ts
// ensureDirs(): 创建 uploads/.staging, uploads/models, uploads/thumbnails
// stagingPath(uuid, ext): 返回 .staging/tmp_{uuid}.{ext}
// finalModelPath(uuid): 返回 models/{uuid}.glb
// finalThumbPath(uuid): 返回 thumbnails/{uuid}.png
// atomicRename(src, dest): fs.rename 封装
// cleanupStaging(uuid): 删除 staging 中该 uuid 的所有临时文件
```

`server/src/glb.ts`：
- `validateGlb(filePath)`: 读取前 12 字节，校验 magic(0x46546C67) + version(2) + length == fileSize
- **不在 Node 侧做 bbox 解析**。bbox/autoScale 计算移至步骤 8 的 Playwright 渲染页中完成（同一次加载 GLB：计算 bbox + 截图），避免 Node 环境下 Three.js GLTFLoader 的纹理/图片加载、浏览器 API 缺失等问题。

### 验证
- 单元测试：传入合法/非法 GLB 文件，校验返回值

---

## 步骤 4：API 路由 - categories 列表查询

### 目标
`GET /api/categories` 返回所有分类（只读端点，不需要 CRUD）。

### 要改的文件
- 新建 `server/src/routes/categories.ts`
- 修改 `server/src/index.ts`：注册路由插件

### 详细说明

```ts
// GET /api/categories
// 返回 [{ id, name, slug }]
app.get('/api/categories', async () => {
  const { rows } = await pool.query('SELECT id, name, slug FROM categories ORDER BY id');
  return rows;
});
```

### 验证
- `curl http://localhost:3001/api/categories` 返回 8 条分类 JSON

---

## 步骤 5：API 路由 - assets 上传

### 目标
`POST /api/assets` 接收 multipart 上传，执行完整的 staging → 校验 → DB → rename 流程。

### 要改的文件
- 新建 `server/src/routes/assets.ts`
- 修改 `server/src/index.ts`：注册 multipart 插件 + assets 路由

### 详细说明

注册 `@fastify/multipart`：
```ts
app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 3, parts: 4 }
});
```

**超限错误映射**：
- `fileSize` 超限 → `reply.code(413)` + `{ error: 'File too large (max 50MB)' }`
- `files`/`fields`/`parts` 超限 → `reply.code(400)` + `{ error: 'Too many parts' }`
- 使用 `@fastify/multipart` 的 `onFile` / error 事件捕获超限，确保流被消费完毕

**错误路径统一清理策略**：所有错误路径必须 1) 消费完 multipart stream（避免挂起）；2) 删除 staging 中已写入的临时文件。具体做法：用 `try/finally` 包裹整个流程，`finally` 中调用 `cleanupStaging(uuid)`。

`POST /api/assets` handler 流程（严格按设计文档 §5.2）：

1. 从 multipart 读取 `file`（stream）、`name`、`categorySlug` 字段
2. 查询 category_id（slug 不存在 → 400）
3. 生成 uuid，将 file stream 写入 `uploads/.staging/tmp_{uuid}.glb`
4. `validateGlb(stagingPath)` → 失败则清理 staging + 返回 400
5. 调用缩略图+bbox 服务（步骤 8）：生成缩略图 + 返回 bbox_min/bbox_size/auto_scale
   - 缩略图失败时 thumb_path = null，但 bbox 数据仍需成功获取
   - **此步骤先跳过，步骤 8 实现后回来对接**
6. BEGIN → INSERT assets → COMMIT
7. rename staging GLB → final path（失败 → 补偿 DELETE DB + 清理 staging）
8. 如有缩略图：rename staging PNG → final path（失败 → UPDATE thumb_path = NULL）
9. 返回 AssetDto

### 验证
- `curl -F "file=@test.glb" -F "name=测试椅子" -F "categorySlug=chair" http://localhost:3001/api/assets`
- 返回完整 AssetDto，文件出现在 uploads/models/
- 上传非 GLB 文件返回 400
- 上传超过 50MB 返回 413

---

## 步骤 6：API 路由 - assets 查询/更新/删除

### 目标
实现 GET（列表+详情）、PATCH、DELETE 端点。

### 要改的文件
- 修改 `server/src/routes/assets.ts`：添加路由

### 详细说明

`GET /api/assets?category=sofa`：
```sql
SELECT a.*, c.slug as category_slug FROM assets a
JOIN categories c ON a.category_id = c.id
WHERE ($1::text IS NULL OR c.slug = $1)
ORDER BY a.created_at DESC
```
- 将 DB 行映射为 AssetDto（拼接 modelUrl/thumbUrl）

`GET /api/assets/:id`：
- 按 UUID 查询，不存在 → 404

`PATCH /api/assets/:id`：
- 允许更新 `name` 和/或 `categorySlug`
- categorySlug 变更时查询新 category_id，不存在 → 400
- 不存在资产 → 404

`DELETE /api/assets/:id`：
- 先查询获取 file_path / thumb_path
- DELETE FROM assets
- 删除磁盘文件（失败记日志，不阻塞响应）
- 返回 204

新建 `server/src/dto.ts`：
```ts
// rowToAssetDto(row): 将 DB 行转换为 AssetDto
// 拼接 modelUrl: `/uploads/${row.file_path}`
// 拼接 thumbUrl: row.thumb_path ? `/uploads/${row.thumb_path}` : null
```

**路径约定**：DB 的 `file_path` / `thumb_path` 存储不带前导斜杠的相对路径（如 `models/{uuid}.glb`、`thumbnails/{uuid}.png`），`rowToAssetDto` 负责拼接 `/uploads/` 前缀。所有写入 DB 的路径统一由 `storage.ts` 的 `finalModelPath()` / `finalThumbPath()` 生成，确保格式一致。

### 验证
- GET 列表返回已上传的资产，含 modelUrl/thumbUrl
- GET 带 category 筛选正确
- PATCH 改名成功
- DELETE 后资产消失，磁盘文件被删除

---

## 步骤 7：@fastify/static 静态文件服务

### 目标
挂载 `/uploads` 前缀，提供 GLB 和缩略图的静态访问。

### 要改的文件
- 修改 `server/src/index.ts`：注册 @fastify/static

### 详细说明

```ts
app.register(fastifyStatic, {
  root: config.uploadsDir,
  prefix: '/uploads/',
  dotfiles: 'deny',
  maxAge: '30d',
  immutable: true,
  allowedPath: (pathName) => {
    return /^\/models\/[a-f0-9-]+\.glb$/.test(pathName)
        || /^\/thumbnails\/[a-f0-9-]+\.png$/.test(pathName);
  },
});
```

### 验证
- 上传资产后，浏览器访问 `http://localhost:3001/uploads/models/{uuid}.glb` 可下载
- 访问 `/uploads/.staging/` 返回 403
- 访问不存在的路径返回 404

---

## 步骤 8：Playwright 缩略图 + bbox 计算服务

### 目标
服务启动时预启动 Playwright browser，上传时调用生成 256x256 PNG 缩略图，**同时在浏览器环境计算 bbox/autoScale**（避免 Node 环境下 Three.js GLTFLoader 的兼容性问题）。

### 要改的文件
- 新建 `server/src/thumbnail.ts`（缩略图 + bbox 服务）
- 新建 `server/src/thumbnail-viewer.html`（最小 Three.js 渲染页，负责 bbox 计算 + 截图）
- 新建 `server/src/routes/internal.ts`（内部路由 `/__thumb/model/:uuid`，仅供缩略图服务使用）
- 修改 `server/src/routes/assets.ts`：上传流程调用缩略图+bbox 生成
- 修改 `server/src/index.ts`：启动/关闭时管理 browser 生命周期 + 注册内部路由
- 修改 `server/package.json`：添加 `playwright` 依赖

### 详细说明

#### 内部路由（解决 file:// 问题）

**不使用 `file:///` 协议加载 GLB**（Windows 路径编码 + 浏览器 file:// fetch 限制会非常脆弱）。改为 Fastify 注册内部路由：

`server/src/routes/internal.ts`：
```ts
// GET /__thumb/model/:uuid
// 从 .staging 目录读取 tmp_{uuid}.glb 返回 stream
// 不走 @fastify/static，不会暴露 .staging 目录
// 此路由仅供 thumbnail 服务内部使用
```

Playwright 页面通过 `http://127.0.0.1:{port}/__thumb/model/{uuid}` 加载 GLB。

#### 缩略图 + bbox 服务

`server/src/thumbnail.ts`：
```ts
// let browser: Browser | null
// initBrowser(): 启动 chromium（headless）
// closeBrowser(): 关闭

interface ThumbnailResult {
  success: boolean;
  bboxMin?: [number, number, number];
  bboxSize?: [number, number, number];
  autoScale?: number;
}

// generateThumbnailAndBBox(uuid, outputPngPath): Promise<ThumbnailResult>
//   - 创建 page，设置 viewport 256x256
//   - page.goto(`http://127.0.0.1:${config.port}/__thumb/model/${uuid}`)
//     加载 thumbnail-viewer.html，查询参数传 uuid
//   - 等待页面 window.__ready === true（最多 15 秒）
//   - 从页面读取 window.__bboxResult（JSON：bboxMin/bboxSize/autoScale）
//   - page.screenshot({ path: outputPngPath, type: 'png' })
//   - page.close()
//   - 返回 { success: true, bboxMin, bboxSize, autoScale }
//   - 任何异常返回 { success: false } + 记日志
```

#### 渲染页

`server/src/thumbnail-viewer.html`：
- 内联 Three.js（从 CDN）
- 从 URL 参数获取 uuid，通过 `fetch('/__thumb/model/' + uuid)` 加载 GLB
- 加载 GLB → **计算 bbox（Box3.setFromObject）+ autoScale** → 自动居中 → 45° 俯视相机 → 环境光 + 方向光 → 渲染 1 帧
- 渲染完成后设置 `window.__bboxResult = { bboxMin, bboxSize, autoScale }` 和 `window.__ready = true`
- autoScale 公式复用前端 `src/services/asset.ts` 的逻辑（目标最大维度 ~1.5 单位）

#### 并发控制
用简单的 Promise 队列限制同时只有 1 个 page 在渲染。

#### 生命周期

`server/src/index.ts`：
```ts
app.addHook('onReady', async () => { await initBrowser(); });
app.addHook('onClose', async () => { await closeBrowser(); });
```

#### 与上传流程的对接

步骤 5 上传流程第 5 步改为调用 `generateThumbnailAndBBox(uuid, stagingPngPath)`：
- 成功：获取 bbox 数据 + 缩略图
- 缩略图截图失败但 bbox 成功：入库但 thumb_path = NULL
- bbox 也失败：整个上传返回 500（bbox 是必需数据）

### 验证
- 上传 GLB 后，`uploads/thumbnails/{uuid}.png` 存在且为有效 PNG
- API 返回的 bboxMin/bboxSize/autoScale 与前端旧逻辑计算结果一致
- 上传损坏的 GLB，整体失败返回 400（因为 bbox 无法计算）
- 并发上传 2 个文件，不会崩溃
- `/__thumb/model/:uuid` 仅在 staging 中有对应文件时返回 200

---

## 步骤 9：前端 - Asset 类型 + API client

### 目标
更新 Asset 接口，新建 API client 封装所有后端请求。

### 要改的文件
- 修改 `src/types/furniture.ts`：更新 Asset 接口
- 新建 `src/services/api.ts`：API client

### 详细说明

`src/types/furniture.ts` Asset 改为：
```ts
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
```
- 删除 `file: Blob` 和 `url: string`
- `FurnitureItem` 不变

`src/services/api.ts`：
```ts
const BASE = '/api';
export async function fetchCategories(): Promise<Category[]>
export async function fetchAssets(category?: string): Promise<Asset[]>
export async function uploadAsset(file: File, name: string, categorySlug: string): Promise<Asset>
  // 用 FormData，POST multipart
export async function deleteAsset(id: string): Promise<void>
export async function updateAsset(id: string, patch: { name?: string; categorySlug?: string }): Promise<Asset>
```

### 验证
- TypeScript 编译通过（`npm run lint`）
- 注意：此步骤后 AssetPanel 和 FurnitureModel 会有类型错误，在步骤 10-12 修复

---

## 步骤 10：前端 - assetSlice 改造

### 目标
assetSlice 从纯内存同步操作改为 API 驱动的异步操作。

### 要改的文件
- 修改 `src/store/slices/assetSlice.ts`

### 详细说明

新的 state 和 actions：
```ts
export interface AssetSlice {
  assets: Asset[];
  categories: Category[];
  selectedAssetId: string | null;
  assetsLoading: boolean;
  uploadStatus: 'idle' | 'uploading' | 'error';  // 上传状态（非进度百分比）
  // 异步 actions
  loadCategories: () => Promise<void>;
  loadAssets: (category?: string) => Promise<void>;
  uploadAsset: (file: File, name: string, categorySlug: string) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  selectAsset: (id: string | null) => void;
}
```

- `loadCategories`：调 `api.fetchCategories()`，写入 `state.categories`
- `loadAssets`：调 `api.fetchAssets(category)`，写入 `state.assets`
- `uploadAsset`：设 uploadStatus='uploading' → 调 `api.uploadAsset()` → push 到 assets → 设 'idle'；失败设 'error'
  > 注意：`fetch + FormData` 无法获取上传进度百分比，这里只跟踪三态状态（idle/uploading/error），前端显示 spinner 而非进度条。如未来需要进度条，需改用 XMLHttpRequest。
- `removeAsset`：调 `api.deleteAsset()` → 从 assets 中移除

### 验证
- TypeScript 编译通过
- store 的 assets 数据来自 API 返回

---

## 步骤 11：前端 - AssetPanel 改造

### 目标
AssetPanel 显示缩略图、分类筛选、异步上传状态。

### 要改的文件
- 修改 `src/components/panels/AssetPanel.tsx`

### 详细说明

启动时加载：
- 组件挂载时调 `loadCategories()` + `loadAssets()`

分类筛选：
- 顶部添加分类 tab 栏（水平滚动），点击切换调 `loadAssets(slug)`
- "全部" tab 调 `loadAssets()`（无参数）

上传改造：
- 上传按钮点击后弹出简单表单：选文件 + 输入名称 + 选分类
- 或简化：文件选择后自动用文件名作为 name，默认分类 "其他"，上传后可在 PropertyPanel 改
- 上传中显示 spinner + "上传中…" 文字（uploadStatus === 'uploading'），不显示进度百分比
- 上传失败显示错误提示

资产卡片：
- `thumbUrl` 存在时显示 `<img src={asset.thumbUrl} />` 替代 Armchair 图标
- `thumbUrl === null` 时降级显示 Armchair 图标（现有行为）

删除：
- 调 `removeAsset(id)`（异步，走 API）

### 验证
- 分类 tab 切换正确筛选资产
- 上传后缩略图正确显示
- 无缩略图的资产显示通用图标
- 删除后资产从列表消失

---

## 步骤 12：前端 - FurnitureModel / GhostPreview 迁移

### 目标
将 `asset.url`（objectURL）替换为 `asset.modelUrl`（服务端静态路径）。

### 要改的文件
- 修改 `src/components/canvas/FurnitureModel.tsx`
- 修改 `src/components/canvas/GhostPreview.tsx`

### 详细说明

`FurnitureModel.tsx`（第 17 行）：
```ts
// 之前：url={asset.url}
// 之后：url={asset.modelUrl}
```

`GhostPreview.tsx`（第 84 行）：
```ts
// 之前：<GhostModel url={asset.url} />
// 之后：<GhostModel url={asset.modelUrl} />
```

两个组件内部的 `useGLTF(url)` 调用不需要改，R3F 的 loader 支持任意 URL。

同时检查是否有其他地方引用 `asset.url` 或 `asset.file`，全部替换。

### 验证
- 放置家具后 3D 模型正确加载（从服务端 URL）
- GhostPreview 预览正常
- `npm run lint` 无类型错误

---

## 步骤 13：Vite proxy + persistence.ts 清理

### 目标
开发环境代理 API 请求到后端；清理 persistence.ts 中的资产相关逻辑。

### 要改的文件
- 修改 `vite.config.ts`：添加 proxy
- 修改 `src/services/persistence.ts`：移除 assets 相关
- 修改 `src/hooks/usePersistence.ts`（如果存在）：移除 assets 保存逻辑

### 详细说明

`vite.config.ts`：
```ts
export default defineConfig({
  // ...existing
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
```

`src/services/persistence.ts`：
- `PersistData` 接口移除 `assets` 字段
- 只保留 `rooms` 和 `items`

### 验证
- `npm run dev` 启动前端，`/api/categories` 正确代理到后端
- `/uploads/models/{uuid}.glb` 正确代理
- IndexedDB 中不再保存 assets 数据
- rooms/items 持久化不受影响

---

## 步骤 14：集成测试

### 目标
端到端验证完整流程。

### 测试场景

1. 启动后端 + 前端
2. 打开页面，分类 tab 显示 8 个分类
3. 上传一个 GLB 文件 → 资产出现在列表中，缩略图显示
4. 点击分类筛选 → 列表正确过滤
5. 选中资产 → 点击地板放置 → 3D 模型正确加载
6. 删除资产 → 从列表消失，磁盘文件被清理
7. 刷新页面 → 资产仍然存在（来自后端）
8. rooms/items 的 IndexedDB 持久化 + undo/redo 不受影响

### 验证
- 所有场景通过
- `npm run lint` 无错误
- `npx vitest run` 单元测试通过（可能需要 mock API）
