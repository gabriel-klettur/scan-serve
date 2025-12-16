import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderPlus, MoreHorizontal, Star } from "lucide-react";
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
import type { ReceiptFolder } from "../types/folder";
import type { FolderTreeNode } from "../utils/folderTree";
import { buildFolderTree, folderPathLabel } from "../utils/folderTree";
import {
  useCreateReceiptFolderMutation,
  useDeleteReceiptFolderMutation,
  useReceiptFoldersQuery,
  useUpdateReceiptFolderMutation,
} from "../hooks/useReceiptFolders";
import { useDefaultFolderIdQuery, useSetDefaultFolderIdMutation } from "../hooks/useReceiptSettings";

export type ExplorerFolderSelection =
  | { type: "all" }
  | { type: "unassigned" }
  | { type: "folder"; folderId: string };

interface FolderTreeExplorerProps {
  selection: ExplorerFolderSelection;
  onChangeSelection: (selection: ExplorerFolderSelection) => void;
}

const normalizeName = (name: string): string => name.trim();

export const FolderTreeExplorer = ({ selection, onChangeSelection }: FolderTreeExplorerProps) => {
  const foldersQuery = useReceiptFoldersQuery();
  const defaultFolderIdQuery = useDefaultFolderIdQuery();

  const createFolderMutation = useCreateReceiptFolderMutation();
  const updateFolderMutation = useUpdateReceiptFolderMutation();
  const deleteFolderMutation = useDeleteReceiptFolderMutation();
  const setDefaultFolderMutation = useSetDefaultFolderIdMutation();

  const folders = foldersQuery.data ?? [];
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const defaultFolderId = defaultFolderIdQuery.data ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

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
        onChangeSelection({ type: "all" });
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
        description: e instanceof Error ? e.message : "Unable to update default folder",
        variant: "destructive",
      });
    }
  };

  const isSelected = (folderId: string): boolean => selection.type === "folder" && selection.folderId === folderId;

  const renderNode = (node: FolderTreeNode, depth: number) => {
    const { folder, children } = node;
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(folder.id);
    const paddingLeft = 10 + depth * 14;

    return (
      <div key={folder.id}>
        <div
          className={
            "flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent " +
            (isSelected(folder.id) ? "bg-accent" : "")
          }
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={!hasChildren}
              onClick={() => toggleExpanded(folder.id)}
            >
              {hasChildren ? (
                isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <span className="w-4" />
              )}
            </Button>

            <button
              type="button"
              className="flex items-center gap-2 min-w-0 text-left"
              onClick={() => onChangeSelection({ type: "folder", folderId: folder.id })}
            >
              <Folder className="h-4 w-4 text-primary" />
              <span className="truncate text-sm">{folder.name}</span>
              {defaultFolderId === folder.id ? <Star className="h-3.5 w-3.5 text-amber-400" /> : null}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openCreate(folder.id)}>
                <FolderPlus className="h-4 w-4" />
                <span>Create subfolder</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openRename(folder)}>
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAsDefault(folder.id)}>
                <Star className="h-4 w-4" />
                <span>Set as default</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAsDefault(null)}
                disabled={defaultFolderId !== folder.id}
              >
                <span>Clear default</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => openDelete(folder.id)}>
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isOpen ? <div>{children.map((c) => renderNode(c, depth + 1))}</div> : null}
      </div>
    );
  };

  const selectedFolderLabel = (() => {
    if (selection.type !== "folder") return null;
    const folder = folders.find((f) => f.id === selection.folderId);
    if (!folder) return null;
    return folderPathLabel(folders, folder.id);
  })();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Folders</div>
        <Button type="button" variant="outline" size="sm" onClick={() => openCreate(null)}>
          <FolderPlus className="h-4 w-4" />
          New
        </Button>
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          className={
            "w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent " +
            (selection.type === "all" ? "bg-accent" : "")
          }
          onClick={() => onChangeSelection({ type: "all" })}
        >
          All Receipts
        </button>
        <button
          type="button"
          className={
            "w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent " +
            (selection.type === "unassigned" ? "bg-accent" : "")
          }
          onClick={() => onChangeSelection({ type: "unassigned" })}
        >
          Unassigned
        </button>
      </div>

      {selectedFolderLabel ? <div className="mt-3 text-xs text-muted-foreground truncate">{selectedFolderLabel}</div> : null}

      <div className="mt-2 flex-1 min-h-0">
        <ScrollArea className="h-full pr-2">
          <div className="space-y-1">
            {tree.map((n) => renderNode(n, 0))}
            {!foldersQuery.isLoading && folders.length === 0 ? (
              <div className="text-sm text-muted-foreground px-2 py-2">No folders yet.</div>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Folder name" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={createFolderMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} placeholder="Folder name" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={updateFolderMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Receipts in this folder (and subfolders) will be moved to "Unassigned".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
