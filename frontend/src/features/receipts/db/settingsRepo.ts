import { openReceiptsDb } from "./database";
import { STORE_RECEIPT_SETTINGS } from "./constants";
import { requestToPromise, transactionToPromise } from "./idb";

export const KEY_DEFAULT_FOLDER_ID = "defaultFolderId" as const;

type ReceiptSettingKey = typeof KEY_DEFAULT_FOLDER_ID;

interface ReceiptSetting<T> {
  key: ReceiptSettingKey;
  value: T;
}

export const getDefaultFolderId = async (): Promise<string | null> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_SETTINGS, "readonly");
  const store = tx.objectStore(STORE_RECEIPT_SETTINGS);

  const setting = await requestToPromise<ReceiptSetting<string | null> | undefined>(store.get(KEY_DEFAULT_FOLDER_ID));
  await transactionToPromise(tx);

  return setting?.value ?? null;
};

export const setDefaultFolderId = async (folderId: string | null): Promise<void> => {
  const db = await openReceiptsDb();
  const tx = db.transaction(STORE_RECEIPT_SETTINGS, "readwrite");
  const store = tx.objectStore(STORE_RECEIPT_SETTINGS);

  const setting: ReceiptSetting<string | null> = {
    key: KEY_DEFAULT_FOLDER_ID,
    value: folderId,
  };

  await requestToPromise(store.put(setting));
  await transactionToPromise(tx);
};
