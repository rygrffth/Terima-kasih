const DB_NAME = 'prolab_offline_db';
const STORE_NAME = 'offline_uploads';
const DB_VERSION = 1;

export interface OfflineUpload {
  id: string;
  judul: string;
  tipe_dokumen: 'LHU' | 'Sertifikat';
  kategori_dokumen: string;
  komoditi: string | null;
  priority: string;
  uploaded_by: string;
  file: File;
  additionalFiles: File[];
  created_at: string;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveOfflineUpload(upload: Omit<OfflineUpload, 'id' | 'created_at'>): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const record: OfflineUpload = {
      ...upload,
      id,
      created_at: new Date().toISOString(),
    };

    const request = store.put(record);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineUploads(): Promise<OfflineUpload[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB open error in getOfflineUploads:', e);
    return [];
  }
}

export async function deleteOfflineUpload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
