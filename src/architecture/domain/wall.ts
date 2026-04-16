export type WallKind = 'structural' | 'partition';

export interface Wall {
  id: string;
  levelId: string;
  startVertexId: string;
  endVertexId: string;
  thickness: number;
  height: number;
  kind: WallKind;
}
