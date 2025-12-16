import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ReceiptFolder } from "../types/folder";
import type { Receipt } from "../types/receipt";
import type { FolderTreeNode } from "../utils/folderTree";
import { buildFolderTree } from "../utils/folderTree";
import {
  useCreateReceiptFolderMutation,
  useDeleteReceiptFolderMutation,
  useReceiptFoldersQuery,
  useUpdateReceiptFolderMutation,
} from "../hooks/useReceiptFolders";
import { useReceiptsQuery } from "../hooks/useReceipts";
import {
  useDefaultFolderIdQuery,
  useSetDefaultFolderIdMutation,
} from "../hooks/useReceiptSettings";

export type FileTreeSelection =
  | { type: "none" }
  | { type: "folder"; folderId: string }
  | { type: "file"; receiptId: string };

interface FileTreeExplorerProps {
  selection: FileTreeSelection;
  onChangeSelection: (selection: FileTreeSelection) => void;
}

const normalizeName = (name: string): string => name.trim();

export const FileTreeExplorer = ({
  selection,
  onChangeSelection,
}: FileTreeExplorerProps) => {
  const foldersQuery = useReceiptFoldersQuery();
  const receiptsQuery = useReceiptsQuery(undefined);
  const defaultFolderIdQuery = useDefaultFolderIdQuery();

  const createFolderMutation = useCreateReceiptFolderMutation();
  const updateFolderMutation = useUpdateReceiptFolderMutation();
  const deleteFolderMutation = useDeleteReceiptFolderMutation();
  const setDefaultFolderMutation = useSetDefaultFolderIdMutation();

  const folders = foldersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const defaultFolderId = defaultFolderIdQuery.data ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["__unassigned__"])
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const unassignedReceipts = useMemo(
    () => receipts.filter((r) => r.folderId === null),
    [receipts]
  );

  const receiptsByFolder = useMemo(() => {
    const map = new Map<string, Receipt[]>();
    for (const r of receipts) {
      if (r.folderId) {
        const list = map.get(r.folderId) ?? [];
        list.push(r);
        map.set(r.folderId, list);
      }
    }
    return map;
  }, [receipts]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId: string | null) => {
    setCreateParentId(parentId);
    setCreateName("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const name = normalizeName(createName);
    if (!name) return;

    try {
      await createFolderMutation.mutateAsync({ name, parentId: createParentId });
      setCreateOpen(false);
      setCreateName("");
      toast({ title: "Folder created" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to create folder",
        variant: "destructive",
      });
    }
  };

  const openRename = (folder: ReceiptFolder) => {
    setRenameFolderId(folder.id);
    setRenameName(folder.name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!renameFolderId) return;
    const name = normalizeName(renameName);
    if (!name) return;

    try {
      await updateFolderMutation.mutateAsync({ id: renameFolderId, name });
      setRenameOpen(false);
      setRenameFolderId(null);
      setRenameName("");
      toast({ title: "Folder updated" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to update folder",
        variant: "destructive",
      });
    }
  };

  const openDelete = (folderId: string) => {
    setDeleteFolderId(folderId);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteFolderId) return;

    try {
      await deleteFolderMutation.mutateAsync(deleteFolderId);
      if (selection.type === "folder" && selection.folderId === deleteFolderId) {
        onChangeSelection({ type: "none" });
      }
      setDeleteOpen(false);
      setDeleteFolderId(null);
      toast({
        title: "Folder deleted",
        description: "Receipts inside were moved to Unassigned.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to delete folder",
        variant: "destructive",
      });
    }
  };

  const setAsDefault = async (folderId: string | null) => {
    try {
      await setDefaultFolderMutation.mutateAsync(folderId);
      toast({ title: "Default folder updated" });
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "Unable to update default folder",
        variant: "destructive",
      });
    }
  };

  const isSelectedFolder = (folderId: string): boolean =>
    selection.type === "folder" && selection.folderId === folderId;

  const isSelectedFile = (receiptId: string): boolean =>
    selection.type === "file" && selection.receiptId === receiptId;

  const renderFileItem = (receipt: Receipt, depth: number) => {
    const paddingLeft = 12 + depth * 16;
    const isSelected = isSelectedFile(receipt.id);

    return (
      <button
        key={receipt.id}
        type="button"
        onClick={() => onChangeSelection({ type: "file", receiptId: receipt.id })}
        className={cn(
          "w-full flex items-center gap-2 py-1 pr-2 text-left text-sm transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft }}
      >
        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{receipt.originalFileName}</span>
      </button>
    );
  };

  const renderFolderNode = (node: FolderTreeNode, depth: number) => {
    const { folder, children } = node;
    const folderReceipts = receiptsByFolder.get(folder.id) ?? [];
    const hasContent = children.length > 0 || folderReceipts.length > 0;
    const isOpen = expanded.has(folder.id);
    const paddingLeft = 4 + depth * 16;
    const isSelected = isSelectedFolder(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center justify-between pr-1 transition-colors",
            "hover:bg-accent/50",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft }}
        >
          <button
            type="button"
            className="flex items-center gap-1 min-w-0 py-1 flex-1 text-left"
            onClick={() => {
              if (hasContent) toggleExpanded(folder.id);
              onChangeSelection({ type: "folder", folderId: folder.id });
            }}
          >
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {hasContent ? (
                isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )
              ) : null}
            </span>
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="truncate text-sm">{folder.name}</span>
            {defaultFolderId === folder.id && (
              <Star className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => openCreate(folder.id)}>
                <FolderPlus className="h-4 w-4" />
                New subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openRename(folder)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAsDefault(folder.id)}>
                <Star className="h-4 w-4" />
                Set as default
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAsDefault(null)}
                disabled={defaultFolderId !== folder.id}
              >
                Clear default
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => openDelete(folder.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isOpen && (
          <div>
            {children.map((c) => renderFolderNode(c, depth + 1))}
            {folderReceipts.map((r) => renderFileItem(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderUnassignedFolder = () => {
    const isOpen = expanded.has("__unassigned__");
    const hasFiles = unassignedReceipts.length > 0;

    return (
      <div>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-1 py-1 px-1 text-left transition-colors",
            "hover:bg-accent/50"
          )}
          onClick={() => {
            if (hasFiles) toggleExpanded("__unassigned__");
          }}
        >
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {hasFiles ? (
              isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : null}
          </span>
          {isOpen ? (
            <FolderOpen className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="truncate text-sm text-muted-foreground">
            Unassigned
          </span>
          {hasFiles && (
            <span className="ml-auto text-xs text-muted-foreground pr-2">
              {unassignedReceipts.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div>
            {unassignedReceipts.map((r) => renderFileItem(r, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col group">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => openCreate(null)}
          title="New folder"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {tree.map((n) => renderFolderNode(n, 0))}
          {renderUnassignedFolder()}

          {!foldersQuery.isLoading &&
            folders.length === 0 &&
            unassignedReceipts.length === 0 && (
              <div className="text-xs text-muted-foreground px-4 py-3">
                No files yet. Upload receipts to get started.
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Create folder dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createFolderMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRename}
              disabled={updateFolderMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Receipts in this folder (and subfolders) will be moved to
              "Unassigned".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
