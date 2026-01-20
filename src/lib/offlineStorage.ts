// Offline Storage using IndexedDB for Time Clock
// Syncs with Supabase when connection is restored

const DB_NAME = 'ToolTimeProOffline';
const DB_VERSION = 1;
const STORE_NAME = 'syncQueue';

interface SyncQueueItem {
  id: string;
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  payload: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create sync queue store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// Add item to sync queue
export async function addToSyncQueue(
  action: SyncQueueItem['action'],
  payload: Record<string, unknown>
): Promise<string> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const request = store.add(item);

    request.onsuccess = () => {
      resolve(item.id);
    };

    request.onerror = () => {
      reject(new Error('Failed to add to sync queue'));
    };
  });
}

// Get all unsynced items
export async function getUnsyncedItems(): Promise<SyncQueueItem[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get unsynced items'));
    };
  });
}

// Mark item as synced
export async function markAsSynced(id: string): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error('Failed to mark as synced'));
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get item'));
    };
  });
}

// Delete synced items older than 7 days
export async function cleanupSyncedItems(): Promise<void> {
  const database = await initOfflineDB();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.openCursor(IDBKeyRange.only(true));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const item = cursor.value as SyncQueueItem;
        if (new Date(item.createdAt) < sevenDaysAgo) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to cleanup synced items'));
    };
  });
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// Get current connectivity status with details
export async function getConnectivityStatus(): Promise<{
  online: boolean;
  pendingSync: number;
}> {
  const unsynced = await getUnsyncedItems();
  return {
    online: isOnline(),
    pendingSync: unsynced.length,
  };
}
