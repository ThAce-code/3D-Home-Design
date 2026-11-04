/** SVG displacement-map helpers for Chromium refraction. */

export const DISPLACEMENT_CACHE_LIMIT = 32;

type CacheEntry = {
  dataUrl: string;
  width: number;
  height: number;
  radius: number;
};

const cache = new Map<string, CacheEntry>();

export function isChromiumEngine(userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  const ua = userAgent;
  const isChromium = /Chrome|Chromium|CriOS|Edg\//.test(ua);
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg\//.test(ua)) {
    return false;
  }
  if (/Firefox|FxiOS/.test(ua)) {
    return false;
  }
  return isChromium;
}

export function displacementCacheKey(width: number, height: number, radius: number): string {
  return `${Math.round(width)}x${Math.round(height)}r${Math.round(radius)}`;
}

function touchCache(key: string, entry: CacheEntry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > DISPLACEMENT_CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function createDisplacementMapDataUrl(width: number, height: number, radius = 28): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const r = Math.max(0, Math.round(radius));
  const key = displacementCacheKey(w, h, r);
  const cached = cache.get(key);
  if (cached) {
    touchCache(key, cached);
    return cached.dataUrl;
  }

  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return '';
  }

  const image = ctx.createImageData(w, h);
  const data = image.data;
  const edgeBand = Math.max(8, Math.min(w, h) * 0.18);
  const midX = (w - 1) / 2;
  const midY = (h - 1) / 2;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const distEdge = Math.min(x, w - 1 - x, y, h - 1 - y);
      const cornerDx = Math.max(0, Math.abs(x - midX) - Math.max(0, midX - r));
      const cornerDy = Math.max(0, Math.abs(y - midY) - Math.max(0, midY - r));
      const cornerDist = Math.hypot(cornerDx, cornerDy);
      const cornerWeight = r > 0 ? Math.min(1, cornerDist / Math.max(1, r)) : 0;
      const edgeWeight = Math.max(0, 1 - distEdge / edgeBand);
      const strength = Math.min(1, edgeWeight * 0.85 + cornerWeight * 0.35);
      const nx = (x - midX) / Math.max(1, midX);
      const ny = (y - midY) / Math.max(1, midY);
      data[i] = Math.round(128 + nx * strength * 110);
      data[i + 1] = Math.round(128 + ny * strength * 110);
      data[i + 2] = 128;
      data[i + 3] = Math.round(40 + strength * 215);
    }
  }

  ctx.putImageData(image, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  touchCache(key, { dataUrl, width: w, height: h, radius: r });
  return dataUrl;
}

export function getDisplacementCacheSizeForTests(): number {
  return cache.size;
}

export function clearDisplacementCacheForTests(): void {
  cache.clear();
}

export function peekDisplacementCacheForTests(key: string): CacheEntry | undefined {
  return cache.get(key);
}
