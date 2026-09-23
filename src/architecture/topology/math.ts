export type Point2 = [number, number];
const DEFAULT_EPSILON = 1e-9;

export interface XYLike {
  x: number;
  y: number;
}

export function subtractPoints(a: Point2, b: Point2): Point2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function distanceBetweenPoints(a: Point2, b: Point2): number {
  const delta = subtractPoints(a, b);

  return Math.hypot(delta[0], delta[1]);
}

export function cross2D(a: Point2, b: Point2): number {
  return (a[0] * b[1]) - (a[1] * b[0]);
}

export function dot2D(a: Point2, b: Point2): number {
  return (a[0] * b[0]) + (a[1] * b[1]);
}

export function isWithinTolerance(value: number, tolerance: number, epsilon = DEFAULT_EPSILON): boolean {
  return value <= (tolerance + epsilon);
}
