export interface Room {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  transparentWalls: Record<string, boolean>;
}
