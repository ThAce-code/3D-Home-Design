import { chromium, Browser, Page } from 'playwright';
import { config } from './config.js';

let browser: Browser | null = null;
let queue: Promise<void> = Promise.resolve();

export interface ThumbnailResult {
  success: boolean;
  bboxMin?: [number, number, number];
  bboxSize?: [number, number, number];
  autoScale?: number;
}

export async function initBrowser(): Promise<void> {
  browser = await chromium.launch({ headless: true });
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * 生成缩略图 + 计算 bbox/autoScale
 * @param uuid — staging 中的文件 uuid
 * @param outputPngPath — 缩略图输出的绝对路径
 */
export async function generateThumbnailAndBBox(
  uuid: string,
  outputPngPath: string,
): Promise<ThumbnailResult> {
  // 串行化：用 Promise 队列确保同时只有 1 个 page 在渲染
  return new Promise<ThumbnailResult>((resolve) => {
    queue = queue
      .then(async () => {
        resolve(await doGenerate(uuid, outputPngPath));
      })
      .catch((err) => {
        console.error('Thumbnail queue failure:', err);
        resolve({ success: false });
      });
  });
}

async function doGenerate(
  uuid: string,
  outputPngPath: string,
): Promise<ThumbnailResult> {
  if (!browser) {
    return { success: false };
  }

  let page: Page | null = null;
  const diagnostics: string[] = [];
  try {
    page = await browser.newPage({ viewport: { width: 256, height: 256 } });
    page.on('console', (m) => {
      if (m.type() === 'error') diagnostics.push(`[console] ${m.text()}`);
    });
    page.on('pageerror', (e) => {
      diagnostics.push(`[pageerror] ${e.message}`);
    });
    page.on('requestfailed', (r) => {
      const failure = r.failure();
      diagnostics.push(`[requestfailed] ${r.url()} :: ${failure?.errorText ?? 'unknown'}`);
    });

    // thumbnail-viewer.html 通过内部路由加载 GLB
    const viewerUrl = `http://127.0.0.1:${config.port}/__thumb/viewer?uuid=${uuid}`;
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 等待渲染完成（最多 15 秒）
    await page.waitForFunction(
      'window.__ready === true',
      undefined,
      { timeout: 60000, polling: 'raf' },
    );

    // 读取 bbox 结果
    const bboxResult = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__bboxResult as {
        bboxMin: [number, number, number];
        bboxSize: [number, number, number];
        autoScale: number;
      } | null,
    );

    if (!bboxResult || !bboxResult.bboxMin || !bboxResult.bboxSize) {
      return { success: false };
    }

    // 截图
    await page.screenshot({ path: outputPngPath, type: 'png' });

    return {
      success: true,
      bboxMin: bboxResult.bboxMin,
      bboxSize: bboxResult.bboxSize,
      autoScale: bboxResult.autoScale,
    };
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    if (diagnostics.length > 0) {
      console.error('Thumbnail render diagnostics:\n' + diagnostics.join('\n'));
    }
    return { success: false };
  } finally {
    if (page) {
      await page.close().catch((e) => {
        console.warn('Failed to close thumbnail page:', e);
      });
    }
  }
}
