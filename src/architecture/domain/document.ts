import type { Level } from './level.js';
import type { Vertex } from './vertex.js';
import type { Wall } from './wall.js';
import type { Zone, ZoneTombstone } from './zone.js';

export interface ArchitectureDocument {
  levels: Record<string, Level>;
  levelOrder: string[];
  vertices: Record<string, Vertex>;
  walls: Record<string, Wall>;
  wallOrder: string[];
  zones: Record<string, Zone>;
  zoneOrder: string[];
  zoneTombstones: ZoneTombstone[];
}

export const DEFAULT_LEVEL_NAME = 'Level 1';
export const DEFAULT_LEVEL_ELEVATION = 0;
export const DEFAULT_WALL_HEIGHT = 3;
export const DEFAULT_WALL_THICKNESS = 0.2;

export function createEmptyArchitectureDocument(): ArchitectureDocument {
  const levelId = crypto.randomUUID();
  const level: Level = {
    id: levelId,
    name: DEFAULT_LEVEL_NAME,
    elevation: DEFAULT_LEVEL_ELEVATION,
    defaultWallHeight: DEFAULT_WALL_HEIGHT,
    defaultWallThickness: DEFAULT_WALL_THICKNESS,
    vertexIds: [],
    wallIds: [],
    zoneIds: [],
  };

  return {
    levels: {
      [levelId]: level,
    },
    levelOrder: [levelId],
    vertices: {},
    walls: {},
    wallOrder: [],
    zones: {},
    zoneOrder: [],
    zoneTombstones: [],
  };
}

export function cloneArchitectureDocument(document: ArchitectureDocument): ArchitectureDocument {
  return {
    levels: Object.fromEntries(
      Object.entries(document.levels).map(([levelId, level]) => [
        levelId,
        {
          ...level,
          vertexIds: [...level.vertexIds],
          wallIds: [...level.wallIds],
          zoneIds: [...level.zoneIds],
        },
      ])
    ),
    levelOrder: [...document.levelOrder],
    vertices: Object.fromEntries(
      Object.entries(document.vertices).map(([vertexId, vertex]) => [
        vertexId,
        { ...vertex },
      ])
    ),
    walls: Object.fromEntries(
      Object.entries(document.walls).map(([wallId, wall]) => [
        wallId,
        { ...wall },
      ])
    ),
    wallOrder: [...document.wallOrder],
    zones: Object.fromEntries(
      Object.entries(document.zones).map(([zoneId, zone]) => [
        zoneId,
        {
          ...zone,
          boundaryVertexIds: [...zone.boundaryVertexIds],
        },
      ])
    ),
    zoneOrder: [...document.zoneOrder],
    zoneTombstones: (document.zoneTombstones ?? []).map((tombstone) => ({
      ...tombstone,
      geometry: {
        ...tombstone.geometry,
        centroid: [...tombstone.geometry.centroid],
        points: tombstone.geometry.points.map((point) => [...point]),
      },
    })),
  };
}

export function getPrimaryLevelId(document: ArchitectureDocument): string {
  const [levelId] = document.levelOrder;

  if (!levelId || !document.levels[levelId]) {
    throw new Error('Architecture document requires at least one level.');
  }

  return levelId;
}

export function syncLevelEntityIds(document: ArchitectureDocument): ArchitectureDocument {
  const next = cloneArchitectureDocument(document);
  const vertexIdsByLevelId = new Map<string, string[]>();
  const wallIdsByLevelId = new Map<string, string[]>();
  const zoneIdsByLevelId = new Map<string, string[]>();

  for (const levelId of next.levelOrder) {
    vertexIdsByLevelId.set(levelId, []);
    wallIdsByLevelId.set(levelId, []);
    zoneIdsByLevelId.set(levelId, []);
  }

  for (const wallId of next.wallOrder) {
    const wall = next.walls[wallId];

    if (!wall) {
      continue;
    }

    wallIdsByLevelId.get(wall.levelId)?.push(wallId);

    const vertexIds = vertexIdsByLevelId.get(wall.levelId);
    if (!vertexIds) {
      continue;
    }

    if (!vertexIds.includes(wall.startVertexId)) {
      vertexIds.push(wall.startVertexId);
    }

    if (!vertexIds.includes(wall.endVertexId)) {
      vertexIds.push(wall.endVertexId);
    }
  }

  for (const zoneId of next.zoneOrder) {
    const zone = next.zones[zoneId];

    if (zone) {
      zoneIdsByLevelId.get(zone.levelId)?.push(zoneId);
    }
  }

  for (const levelId of next.levelOrder) {
    const level = next.levels[levelId];

    if (!level) {
      continue;
    }

    next.levels[levelId] = {
      ...level,
      vertexIds: vertexIdsByLevelId.get(levelId) ?? [],
      wallIds: wallIdsByLevelId.get(levelId) ?? [],
      zoneIds: zoneIdsByLevelId.get(levelId) ?? [],
    };
  }

  return next;
}
