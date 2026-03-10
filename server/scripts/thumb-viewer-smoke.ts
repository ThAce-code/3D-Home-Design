import Fastify from 'fastify';
import { chromium } from 'playwright';
import { internalRoutes } from '../src/routes/internal.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: false });
  await internalRoutes(app);
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unexpected server address');
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 256, height: 256 } });

    const diagnostics: string[] = [];
    page.on('console', (m) => {
      diagnostics.push(`[console:${m.type()}] ${m.text()}`);
    });
    page.on('pageerror', (e) => {
      diagnostics.push(`[pageerror] ${e.message}`);
    });
    page.on('requestfailed', (r) => {
      const failure = r.failure();
      diagnostics.push(`[requestfailed] ${r.url()} :: ${failure?.errorText ?? 'unknown'}`);
    });

    const viewerUrl = `http://127.0.0.1:${address.port}/__thumb/viewer`;
    try {
      await page.goto(viewerUrl, { waitUntil: 'load', timeout: 5000 });

      await page.waitForFunction(
        'window.__ready === true',
        undefined,
        { timeout: 5000 },
      );

      const readyValue = await page.evaluate(() => (window as any).__ready);
      if (readyValue !== true) {
        throw new Error(`Unexpected __ready value: ${String(readyValue)}`);
      }
    } catch (err) {
      if (diagnostics.length > 0) {
        console.error('Smoke diagnostics:\n' + diagnostics.join('\n'));
      }
      throw err;
    }
  } finally {
    await browser.close();
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
