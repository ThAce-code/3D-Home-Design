import { openDB } from 'idb';
import type { FurnitureItem } from '../types/furniture.js';

const DB_NAME = 'home-design-v2';
const DB_VERSION = 1;
const STORE_NAME = 'state';

export interface PersistData {
  items: FurnitureItem[];
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveState(data: PersistData): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, data, 'current');
}

export async function loadState(): Promise<PersistData | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, 'current');
}
