export type ZoneKind = 'room' | 'corridor' | 'balcony' | 'unknown';

export interface Zone {
  id: string;
  levelId: string;
  boundaryVertexIds: string[];
  kind: ZoneKind;
  name: string | null;
}

export interface ZoneTombstone {
  id: string;
  levelId: string;
  kind: ZoneKind;
  name: string | null;
  geometry: {
    area: number;
    centroid: [number, number];
    points: Array<[number, number]>;
  };
  signature: string;
}
