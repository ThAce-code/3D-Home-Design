import { reduceArchitectureCommand } from './reducers.js';
import {
  updateArchitectureDocumentStore,
  type ArchitectureDocumentControllerState,
  type StoreAccessor,
} from './controllerStores.js';
import type { Opening, OpeningKind } from '../domain/opening.js';
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

interface CreateOpeningPropertyStoreControllerArgs {
  documentStore: StoreAccessor<ArchitectureDocumentControllerState>;
}

export function createOpeningPropertyStoreController({
  documentStore,
}: CreateOpeningPropertyStoreControllerArgs) {
  return {
    addOpening(args: {
      wallId: string;
      kind: OpeningKind;
      t?: number;
    }) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'ADD_OPENING',
        wallId: args.wallId,
        kind: args.kind,
        t: args.t ?? 0.5,
      }));
    },
    patchOpening(
      openingId: string,
      patch: Partial<Pick<Opening, 'kind' | 't' | 'width' | 'height' | 'sillHeight'>>,
    ) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'SET_OPENING_PROPS',
        openingId,
        patch,
      }));
    },
    deleteOpening(openingId: string) {
      updateArchitectureDocumentStore(documentStore, (document) => reduceArchitectureCommand(document, {
        type: 'DELETE_OPENING',
        openingId,
      }));
    },
  };
}
