export type DisplacementMapOptions = {
  width: number;
  height: number;
  /** Corner radius in px, clamped to half of the shorter side. */
  radius: number;
  /** Width of the refracting rim in px. The interior beyond the rim is left undisplaced. */
  bezel: number;
};

/** Signed distance from (px, py) to a rounded rectangle anchored at the origin; negative inside. */
export function roundedRectSdf(px: number, py: number, width: number, height: number, radius: number) {
  const qx = Math.abs(px - width / 2) - (width / 2 - radius);
  const qy = Math.abs(py - height / 2) - (height / 2 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

/**
 * Builds an RGBA displacement map for feDisplacementMap (R = x, G = y, 128 = no offset).
 *
 * Inside the rim each pixel samples the backdrop slightly further inward, so content bends at
 * the edge like a convex lens while the centre stays flat. Strength falls off quadratically
 * from the edge to the inner end of the rim.
 */
export function createDisplacementData({ width, height, radius, bezel }: DisplacementMapOptions) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const rim = Math.max(1, bezel);
  const data = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const offset = (y * w + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;
      const depth = -roundedRectSdf(cx, cy, w, h, r);
      let dx = 0;
      let dy = 0;

      if (depth > 0 && depth < rim) {
        // Outward normal from the SDF gradient; displacement points the opposite way.
        const nx = roundedRectSdf(cx + 0.5, cy, w, h, r) - roundedRectSdf(cx - 0.5, cy, w, h, r);
        const ny = roundedRectSdf(cx, cy + 0.5, w, h, r) - roundedRectSdf(cx, cy - 0.5, w, h, r);
        const length = Math.hypot(nx, ny) || 1;
        const strength = (1 - depth / rim) ** 2;
        dx = (-nx / length) * strength;
        dy = (-ny / length) * strength;
      }

      data[offset] = 128 + dx * 127;
      data[offset + 1] = 128 + dy * 127;
      data[offset + 2] = 128;
      data[offset + 3] = 255;
    }
  }

  return { width: w, height: h, data };
}

/** Renders the displacement map to a data URL for <feImage>. Returns null outside the browser. */
export function createDisplacementMapUrl(options: DisplacementMapOptions) {
  if (typeof document === 'undefined') {
    return null;
  }

  const { width, height, data } = createDisplacementData(options);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.putImageData(new ImageData(data, width, height), 0, 0);
  return canvas.toDataURL();
}
