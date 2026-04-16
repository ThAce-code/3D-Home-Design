import { reduceArchitectureCommand } from './reducers.js';
import {
  updateArchitectureDocumentStore,
  type ArchitectureDocumentControllerState,
  type StoreAccessor,
} from './controllerStores.js';

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
  };
}
