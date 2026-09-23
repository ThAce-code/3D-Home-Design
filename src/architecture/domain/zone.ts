export type ZoneKind = 'room' | 'corridor' | 'balcony' | 'unknown';

export interface Zone {
  id: string;
  levelId: string;
  boundaryVertexIds: string[];
  kind: ZoneKind;
  name: string | null;
}
