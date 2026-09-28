/**
 * IndexedDB storage utility for large binary assets (PDFs, images)
 * Eliminates LocalStorage 5MB quota restrictions and allows instant local caching.
 */

const DB_NAME = 'fenix_files_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredFileRecord {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  savedAt: string;
}

const memoryFallback = new Map<string, StoredFileRecord>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function setFileInIndexedDb(record: StoredFileRecord): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        memoryFallback.set(record.id, record);
        resolve();
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    memoryFallback.set(record.id, record);
  }
}

export async function getFileFromIndexedDb(id: string): Promise<StoredFileRecord | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve((req.result as StoredFileRecord) || memoryFallback.get(id) || null);
      };
      req.onerror = () => {
        resolve(memoryFallback.get(id) || null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    return memoryFallback.get(id) || null;
  }
}

export async function deleteFileFromIndexedDb(id: string): Promise<void> {
  memoryFallback.delete(id);
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}
