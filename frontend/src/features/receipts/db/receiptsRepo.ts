import type { OCRResponse } from "@/types/ocr";
import type { Receipt } from "../types/receipt";
import { createId } from "../utils/id";
import { openReceiptsDb } from "./database";
import { requestToPromise, transactionToPromise } from "./idb";
import { STORE_RECEIPT_FOLDERS, STORE_RECEIPTS } from "./constants";
import { getDefaultFolderId } from "./settingsRepo";

export interface CreateReceiptInput {
  folderId?: string | null;
  file: File;
  ocr: OCRResponse | null;
}

export interface UpdateReceiptFolderInput {
  receiptId: string;
  folderId: string | null;
}

export const listReceipts = async (folderId?: string | null): Promise<Receipt[]> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPTS, "readonly");
  const store = tx.objectStore(STORE_RECEIPTS);

  // With no filter, use index by_createdAt for descending order.
  if (folderId === undefined) {
    const index = store.index("by_createdAt");

    const receipts = await new Promise<Receipt[]>((resolve, reject) => {
      const results: Receipt[] = [];
      const cursorRequest = index.openCursor(null, "prev");

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        results.push(cursor.value as Receipt);
        cursor.continue();
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    await transactionToPromise(tx);
    return receipts;
  }

  // Filter by folderId (including null = unassigned)
  const index = store.index("by_folderId_createdAt");
  const range = IDBKeyRange.bound([folderId, 0], [folderId, Number.MAX_SAFE_INTEGER]);

  const receipts = await new Promise<Receipt[]>((resolve, reject) => {
    const results: Receipt[] = [];
    const cursorRequest = index.openCursor(range, "prev");

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve(results);
        return;
      }
      results.push(cursor.value as Receipt);
      cursor.continue();
    };

    cursorRequest.onerror = () => reject(cursorRequest.error);
  });

  await transactionToPromise(tx);
  return receipts;
};

export const getReceiptById = async (id: string): Promise<Receipt | null> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPTS, "readonly");
  const store = tx.objectStore(STORE_RECEIPTS);

  const receipt = await requestToPromise<Receipt | undefined>(store.get(id));
  await transactionToPromise(tx);

  return receipt ?? null;
};

export const createReceipt = async (input: CreateReceiptInput): Promise<Receipt> => {
  const now = Date.now();

  const resolvedFolderId = input.folderId === undefined ? await getDefaultFolderId() : input.folderId;

  const receipt: Receipt = {
    id: createId(),
    folderId: resolvedFolderId ?? null,
    createdAt: now,
    updatedAt: now,
    originalFileName: input.file.name,
    mimeType: input.file.type,
    imageBlob: input.file,
    ocr: input.ocr,
  };

  const db = await openReceiptsDb();
  const tx = db.transaction([STORE_RECEIPTS, STORE_RECEIPT_FOLDERS], "readwrite");

  if (receipt.folderId) {
    const foldersStore = tx.objectStore(STORE_RECEIPT_FOLDERS);
    const folder = await requestToPromise(foldersStore.get(receipt.folderId));
    if (!folder) {
      tx.abort();
      throw new Error("Folder not found");
    }
  }

  const store = tx.objectStore(STORE_RECEIPTS);
  await requestToPromise(store.add(receipt));
  await transactionToPromise(tx);

  return receipt;
};

export const updateReceiptFolder = async (input: UpdateReceiptFolderInput): Promise<Receipt> => {
  const db = await openReceiptsDb();
  const tx = db.transaction([STORE_RECEIPTS, STORE_RECEIPT_FOLDERS], "readwrite");
  const receiptsStore = tx.objectStore(STORE_RECEIPTS);

  const current = (await requestToPromise(receiptsStore.get(input.receiptId))) as Receipt | undefined;
  if (!current) {
    tx.abort();
    throw new Error("Receipt not found");
  }

  if (input.folderId) {
    const foldersStore = tx.objectStore(STORE_RECEIPT_FOLDERS);
    const folder = await requestToPromise(foldersStore.get(input.folderId));
    if (!folder) {
      tx.abort();
      throw new Error("Folder not found");
    }
  }

  const updated: Receipt = {
    ...current,
    folderId: input.folderId,
    updatedAt: Date.now(),
  };

  await requestToPromise(receiptsStore.put(updated));
  await transactionToPromise(tx);

  return updated;
};

export const updateReceiptOcr = async (receiptId: string, ocr: OCRResponse | null): Promise<Receipt> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPTS, "readwrite");
  const store = tx.objectStore(STORE_RECEIPTS);

  const current = (await requestToPromise(store.get(receiptId))) as Receipt | undefined;
  if (!current) {
    tx.abort();
    throw new Error("Receipt not found");
  }

  const updated: Receipt = {
    ...current,
    ocr,
    updatedAt: Date.now(),
  };

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);

  return updated;
};

export const deleteReceipt = async (id: string): Promise<void> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPTS, "readwrite");
  const store = tx.objectStore(STORE_RECEIPTS);

  await requestToPromise(store.delete(id));
  await transactionToPromise(tx);
};
