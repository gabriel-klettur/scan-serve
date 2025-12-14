export const receiptFolderKeys = {
  all: ["receiptFolders"] as const,
};

export const receiptKeys = {
  all: ["receipts"] as const,
  list: (folderId: string | null | undefined) => ["receipts", "list", folderId] as const,
  detail: (id: string) => ["receipts", "detail", id] as const,
};
