import type { Point2 } from '../topology/math.js';

export function resolveWallNumericEntryPoint({
  startPoint,
  currentPoint,
  length,
}: {
  startPoint: Point2;
  currentPoint: Point2;
  length: number;
}): Point2 | null {
  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }

  const dx = currentPoint[0] - startPoint[0];
  const dy = currentPoint[1] - startPoint[1];
  const currentLength = Math.hypot(dx, dy);

  if (currentLength <= 1e-9) {
    return null;
  }

  const scale = length / currentLength;

  return [
    startPoint[0] + dx * scale,
    startPoint[1] + dy * scale,
  ];
}
