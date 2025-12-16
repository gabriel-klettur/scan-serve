import {
  RECEIPTS_DB_NAME,
  RECEIPTS_DB_VERSION,
  STORE_RECEIPT_FOLDERS,
  STORE_RECEIPT_SETTINGS,
  STORE_RECEIPTS,
} from "./constants";

let dbPromise: Promise<IDBDatabase> | null = null;

export const openReceiptsDb = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(RECEIPTS_DB_NAME, RECEIPTS_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(STORE_RECEIPT_FOLDERS)) {
        const foldersStore = db.createObjectStore(STORE_RECEIPT_FOLDERS, { keyPath: "id" });
        foldersStore.createIndex("by_name", "name", { unique: false });
        foldersStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
        foldersStore.createIndex("by_parentId", "parentId", { unique: false });
      } else {
        const foldersStore = request.transaction?.objectStore(STORE_RECEIPT_FOLDERS);
        if (foldersStore) {
          if (foldersStore.indexNames.contains("by_name")) {
            const byName = foldersStore.index("by_name");
            if (byName.unique) {
              foldersStore.deleteIndex("by_name");
              foldersStore.createIndex("by_name", "name", { unique: false });
            }
          } else {
            foldersStore.createIndex("by_name", "name", { unique: false });
          }

          if (!foldersStore.indexNames.contains("by_parentId")) {
            foldersStore.createIndex("by_parentId", "parentId", { unique: false });
          }
        }
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

      if (!db.objectStoreNames.contains(STORE_RECEIPT_SETTINGS)) {
        db.createObjectStore(STORE_RECEIPT_SETTINGS, { keyPath: "key" });
      }

      if (oldVersion > 0 && oldVersion < 3) {
        const tx = request.transaction;
        const foldersStore = tx?.objectStore(STORE_RECEIPT_FOLDERS);

        if (foldersStore) {
          const cursorRequest = foldersStore.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) {
              return;
            }
            const value = cursor.value as Record<string, unknown>;
            if (!Object.prototype.hasOwnProperty.call(value, "parentId")) {
              cursor.update({
                ...value,
                parentId: null,
              });
            }
            cursor.continue();
          };
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};
