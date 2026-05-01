import { reduceArchitectureCommand } from './reducers.js';
import {
  updateArchitectureDocumentStore,
  type ArchitectureDocumentControllerState,
  type StoreAccessor,
} from './controllerStores.js';
import type { ZoneKind } from '../domain/zone.js';

interface CreateWallPropertyStoreControllerArgs {
  documentStore: StoreAccessor<ArchitectureDocumentControllerState>;
}

export function createWallPropertyStoreController({
  documentStore,
}: CreateWallPropertyStoreControllerArgs) {
  return {
    patchWall(
      wallId: string,
      patch: {
        thickness?: number;
        height?: number;
        kind?: 'structural' | 'partition';
      },
    ) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'SET_WALL_PROPS',
        wallId,
        patch,
      }));
    },
    deleteWall(wallId: string) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'DELETE_WALL',
        wallId,
      }));
    },
  };
}

interface CreateZonePropertyStoreControllerArgs {
  documentStore: StoreAccessor<ArchitectureDocumentControllerState>;
}

export function createZonePropertyStoreController({
  documentStore,
}: CreateZonePropertyStoreControllerArgs) {
  return {
    patchZone(
      zoneId: string,
      patch: {
        kind?: ZoneKind;
        name?: string | null;
      },
    ) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'SET_ZONE_PROPS',
        zoneId,
        patch,
      }));
    },
    deleteZone(zoneId: string) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'DELETE_ZONE',
        zoneId,
      }));
    },
  };
}
