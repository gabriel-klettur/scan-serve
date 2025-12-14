import { RECEIPTS_DB_NAME, RECEIPTS_DB_VERSION, STORE_RECEIPT_FOLDERS, STORE_RECEIPTS } from "./constants";

let dbPromise: Promise<IDBDatabase> | null = null;

export const openReceiptsDb = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(RECEIPTS_DB_NAME, RECEIPTS_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_RECEIPT_FOLDERS)) {
        const foldersStore = db.createObjectStore(STORE_RECEIPT_FOLDERS, { keyPath: "id" });
        foldersStore.createIndex("by_name", "name", { unique: true });
        foldersStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
        const receiptsStore = db.createObjectStore(STORE_RECEIPTS, { keyPath: "id" });
        receiptsStore.createIndex("by_folderId", "folderId", { unique: false });
        receiptsStore.createIndex("by_createdAt", "createdAt", { unique: false });
        receiptsStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
        receiptsStore.createIndex("by_folderId_createdAt", ["folderId", "createdAt"], { unique: false });
      } else {
        const receiptsStore = request.transaction?.objectStore(STORE_RECEIPTS);
        if (receiptsStore && !receiptsStore.indexNames.contains("by_folderId_createdAt")) {
          receiptsStore.createIndex("by_folderId_createdAt", ["folderId", "createdAt"], { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};
