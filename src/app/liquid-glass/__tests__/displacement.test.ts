import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DISPLACEMENT_CACHE_LIMIT,
  clearDisplacementCacheForTests,
  createDisplacementMapDataUrl,
  displacementCacheKey,
  getDisplacementCacheSizeForTests,
  isChromiumEngine,
  peekDisplacementCacheForTests,
} from '../displacement';

describe('liquid-glass displacement', () => {
  beforeEach(() => {
    class MockImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    }

    vi.stubGlobal(
      'HTMLCanvasElement',
      class {
        width = 0;
        height = 0;
        getContext() {
          return {
            createImageData: (width: number, height: number) => new MockImageData(width, height),
            putImageData: () => undefined,
          };
        }
        toDataURL() {
          return `data:image/png;base64,${this.width}x${this.height}`;
        }
      },
    );

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return new (globalThis as unknown as { HTMLCanvasElement: new () => HTMLCanvasElement }).HTMLCanvasElement();
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    clearDisplacementCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('detects Chromium engines and excludes Safari/Firefox', () => {
    expect(isChromiumEngine('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36')).toBe(true);
    expect(isChromiumEngine('Mozilla/5.0 Edg/120.0.0.0 Chrome/120.0.0.0 Safari/537.36')).toBe(true);
    expect(
      isChromiumEngine(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(isChromiumEngine('Mozilla/5.0 Firefox/121.0')).toBe(false);
  });

  it('creates and caches displacement maps with a bounded LRU', () => {
    const first = createDisplacementMapDataUrl(64, 32, 12);
    expect(first.startsWith('data:image/png')).toBe(true);
    expect(getDisplacementCacheSizeForTests()).toBe(1);
    expect(peekDisplacementCacheForTests(displacementCacheKey(64, 32, 12))?.dataUrl).toBe(first);
    const again = createDisplacementMapDataUrl(64, 32, 12);
    expect(again).toBe(first);
    for (let i = 0; i < DISPLACEMENT_CACHE_LIMIT + 4; i += 1) {
      createDisplacementMapDataUrl(20 + i, 20, 8);
    }
    expect(getDisplacementCacheSizeForTests()).toBeLessThanOrEqual(DISPLACEMENT_CACHE_LIMIT);
    expect(peekDisplacementCacheForTests(displacementCacheKey(64, 32, 12))).toBeUndefined();
  });
});
