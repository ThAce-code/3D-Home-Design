export interface Level {
  id: string;
  name: string;
  elevation: number;
  defaultWallHeight: number;
  defaultWallThickness: number;
  vertexIds: string[];
  wallIds: string[];
  zoneIds: string[];
}
