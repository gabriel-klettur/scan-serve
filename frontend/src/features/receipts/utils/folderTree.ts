import type { ReceiptFolder } from "../types/folder";

export interface FolderTreeNode {
  folder: ReceiptFolder;
  children: FolderTreeNode[];
}

export const buildFolderTree = (folders: ReceiptFolder[]): FolderTreeNode[] => {
  const byId = new Map<string, ReceiptFolder>();
  const childrenByParent = new Map<string | null, ReceiptFolder[]>();

  for (const f of folders) {
    byId.set(f.id, f);
    const parentKey = f.parentId ?? null;
    const current = childrenByParent.get(parentKey) ?? [];
    current.push(f);
    childrenByParent.set(parentKey, current);
  }

  const sortByName = (a: ReceiptFolder, b: ReceiptFolder) => a.name.localeCompare(b.name);

  const build = (parentId: string | null): FolderTreeNode[] => {
    const children = (childrenByParent.get(parentId) ?? []).slice().sort(sortByName);
    return children.map((child) => ({
      folder: child,
      children: build(child.id),
    }));
  };

  return build(null);
};

export const folderPathLabel = (folders: ReceiptFolder[], folderId: string): string => {
  const byId = new Map<string, ReceiptFolder>();
  for (const f of folders) {
    byId.set(f.id, f);
  }

  const parts: string[] = [];
  let current: ReceiptFolder | undefined = byId.get(folderId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return parts.join(" / ");
};
