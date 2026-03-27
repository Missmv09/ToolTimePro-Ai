// Offline Storage using IndexedDB for Time Clock & Job Caching
// Syncs with Supabase when connection is restored

const DB_NAME = 'ToolTimeProOffline';
const DB_VERSION = 2;
const STORE_NAME = 'syncQueue';
const JOB_CACHE_STORE = 'jobCache';
const PHOTO_QUEUE_STORE = 'photoQueue';

interface SyncQueueItem {
  id: string;
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'job_update' | 'photo_upload';
  payload: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

interface CachedJob {
  id: string;
  companyId: string;
  data: Record<string, unknown>;
  cachedAt: string;
}

interface QueuedPhoto {
  id: string;
  jobId: string;
  companyId: string;
  dataUrl: string; // base64
  type: 'clock_in' | 'clock_out' | 'job_progress' | 'job_complete';
  capturedAt: string;
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

      // Create job cache store
      if (!database.objectStoreNames.contains(JOB_CACHE_STORE)) {
        const jobStore = database.createObjectStore(JOB_CACHE_STORE, { keyPath: 'id' });
        jobStore.createIndex('companyId', 'companyId', { unique: false });
      }

      // Create photo queue store
      if (!database.objectStoreNames.contains(PHOTO_QUEUE_STORE)) {
        const photoStore = database.createObjectStore(PHOTO_QUEUE_STORE, { keyPath: 'id' });
        photoStore.createIndex('synced', 'synced', { unique: false });
        photoStore.createIndex('jobId', 'jobId', { unique: false });
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

// ============================================================
// JOB CACHE: Store job data for offline access
// ============================================================

// Cache a list of jobs for a company
export async function cacheJobs(companyId: string, jobs: Record<string, unknown>[]): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([JOB_CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(JOB_CACHE_STORE);
    const now = new Date().toISOString();

    for (const job of jobs) {
      store.put({
        id: job.id,
        companyId,
        data: job,
        cachedAt: now,
      });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to cache jobs'));
  });
}

// Get cached jobs for a company
export async function getCachedJobs(companyId: string): Promise<Record<string, unknown>[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([JOB_CACHE_STORE], 'readonly');
    const store = transaction.objectStore(JOB_CACHE_STORE);
    const index = store.index('companyId');
    const request = index.getAll(IDBKeyRange.only(companyId));

    request.onsuccess = () => {
      const cached = request.result as CachedJob[];
      resolve(cached.map(c => c.data));
    };

    request.onerror = () => reject(new Error('Failed to get cached jobs'));
  });
}

// ============================================================
// PHOTO QUEUE: Store photos for upload when back online
// ============================================================

// Queue a photo for upload
export async function queuePhoto(
  jobId: string,
  companyId: string,
  dataUrl: string,
  type: QueuedPhoto['type']
): Promise<string> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PHOTO_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTO_QUEUE_STORE);

    const item: QueuedPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      companyId,
      dataUrl,
      type,
      capturedAt: new Date().toISOString(),
      synced: false,
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(item.id);
    request.onerror = () => reject(new Error('Failed to queue photo'));
  });
}

// Get unsynced photos
export async function getUnsyncedPhotos(): Promise<QueuedPhoto[]> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PHOTO_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(PHOTO_QUEUE_STORE);
    const index = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get unsynced photos'));
  });
}

// Mark photo as synced
export async function markPhotoSynced(id: string): Promise<void> {
  const database = await initOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PHOTO_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTO_QUEUE_STORE);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(new Error('Failed to mark photo synced'));
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(new Error('Failed to get photo'));
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
