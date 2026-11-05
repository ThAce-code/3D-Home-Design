import { describe, expect, it } from 'vitest';
import { createDisplacementData, roundedRectSdf } from '../displacementMap';

function pixel(map: ReturnType<typeof createDisplacementData>, x: number, y: number) {
  const offset = (y * map.width + x) * 4;
  return { r: map.data[offset], g: map.data[offset + 1], b: map.data[offset + 2], a: map.data[offset + 3] };
}

describe('roundedRectSdf', () => {
  it('is negative inside, zero on the edge and positive outside', () => {
    expect(roundedRectSdf(50, 20, 100, 40, 10)).toBeLessThan(0);
    expect(roundedRectSdf(0, 20, 100, 40, 10)).toBeCloseTo(0);
    expect(roundedRectSdf(-5, 20, 100, 40, 10)).toBeCloseTo(5);
  });
});

describe('createDisplacementData', () => {
  const map = createDisplacementData({ width: 120, height: 60, radius: 30, bezel: 12 });

  it('produces one opaque RGBA pixel per box pixel', () => {
    expect(map.data).toHaveLength(120 * 60 * 4);
    expect(pixel(map, 0, 0).a).toBe(255);
  });

  it('leaves the interior beyond the rim undisplaced', () => {
    expect(pixel(map, 60, 30)).toMatchObject({ r: 128, g: 128 });
  });

  it('pulls samples inward near the edges', () => {
    // Left edge samples further right (R > 128); top edge samples further down (G > 128).
    expect(pixel(map, 32, 30).r).toBe(128);
    expect(pixel(map, 1, 30).r).toBeGreaterThan(200);
    expect(pixel(map, 60, 1).g).toBeGreaterThan(200);
    expect(pixel(map, 118, 30).r).toBeLessThan(56);
  });

  it('weakens towards the inner end of the rim', () => {
    expect(pixel(map, 2, 30).r).toBeGreaterThan(pixel(map, 8, 30).r);
  });

  it('clamps the radius so pills do not overflow', () => {
    const pill = createDisplacementData({ width: 40, height: 20, radius: 999, bezel: 6 });
    expect(pixel(pill, 20, 10)).toMatchObject({ r: 128, g: 128 });
  });
});
