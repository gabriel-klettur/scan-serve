import { openReceiptsDb } from "./database";
import { requestToPromise, transactionToPromise } from "./idb";
import { STORE_RECEIPT_FOLDERS, STORE_RECEIPTS } from "./constants";
import type { ReceiptFolder } from "../types/folder";
import { createId } from "../utils/id";

export interface CreateFolderInput {
  name: string;
}

export interface UpdateFolderInput {
  id: string;
  name: string;
}

export const listFolders = async (): Promise<ReceiptFolder[]> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_FOLDERS, "readonly");
  const store = tx.objectStore(STORE_RECEIPT_FOLDERS);

  const folders = await requestToPromise<ReceiptFolder[]>(store.getAll());
  await transactionToPromise(tx);

  return folders.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getFolderById = async (id: string): Promise<ReceiptFolder | null> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_FOLDERS, "readonly");
  const store = tx.objectStore(STORE_RECEIPT_FOLDERS);

  const folder = await requestToPromise<ReceiptFolder | undefined>(store.get(id));
  await transactionToPromise(tx);

  return folder ?? null;
};

export const createFolder = async (input: CreateFolderInput): Promise<ReceiptFolder> => {
  const now = Date.now();
  const folder: ReceiptFolder = {
    id: createId(),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_FOLDERS, "readwrite");
  const store = tx.objectStore(STORE_RECEIPT_FOLDERS);

  await requestToPromise(store.add(folder));
  await transactionToPromise(tx);

  return folder;
};

export const updateFolder = async (input: UpdateFolderInput): Promise<ReceiptFolder> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_FOLDERS, "readwrite");
  const store = tx.objectStore(STORE_RECEIPT_FOLDERS);

  const current = await requestToPromise<ReceiptFolder | undefined>(store.get(input.id));
  if (!current) {
    tx.abort();
    throw new Error("Folder not found");
  }

  const updated: ReceiptFolder = {
    ...current,
    name: input.name.trim(),
    updatedAt: Date.now(),
  };

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);

  return updated;
};

export const deleteFolder = async (id: string): Promise<void> => {
  const db = await openReceiptsDb();

  const tx = db.transaction([STORE_RECEIPT_FOLDERS, STORE_RECEIPTS], "readwrite");
  const foldersStore = tx.objectStore(STORE_RECEIPT_FOLDERS);
  const receiptsStore = tx.objectStore(STORE_RECEIPTS);
  const receiptsByFolder = receiptsStore.index("by_folderId");

  // Strategy: receipts in this folder become "unassigned" (folderId = null)
  const range = IDBKeyRange.only(id);

  await new Promise<void>((resolve, reject) => {
    const cursorRequest = receiptsByFolder.openCursor(range);

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }

      cursor.update({
        ...cursor.value,
        folderId: null,
        updatedAt: Date.now(),
      });

      cursor.continue();
    };

    cursorRequest.onerror = () => reject(cursorRequest.error);
  });

  await requestToPromise(foldersStore.delete(id));
  await transactionToPromise(tx);
};
