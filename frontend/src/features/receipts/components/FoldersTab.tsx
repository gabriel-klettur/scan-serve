import { useMemo, useState } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ReceiptFolder } from "../types/folder";
import {
  useCreateReceiptFolderMutation,
  useDeleteReceiptFolderMutation,
  useReceiptFoldersQuery,
  useUpdateReceiptFolderMutation,
} from "../hooks/useReceiptFolders";

const normalizeName = (name: string): string => name.trim();

export const FoldersTab = () => {
  const foldersQuery = useReceiptFoldersQuery();

  const createMutation = useCreateReceiptFolderMutation();
  const updateMutation = useUpdateReceiptFolderMutation();
  const deleteMutation = useDeleteReceiptFolderMutation();

  const folders = foldersQuery.data ?? [];

  const [newName, setNewName] = useState("");
  const [editFolder, setEditFolder] = useState<ReceiptFolder | null>(null);
  const [editName, setEditName] = useState("");

  const canCreate = useMemo(() => normalizeName(newName).length > 0, [newName]);

  const handleCreate = async () => {
    const name = normalizeName(newName);
    if (!name) {
      return;
    }

    try {
      await createMutation.mutateAsync({ name });
      setNewName("");
      toast({ title: "Folder created" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to create folder",
        variant: "destructive",
      });
    }
  };

  const openEdit = (folder: ReceiptFolder) => {
    setEditFolder(folder);
    setEditName(folder.name);
  };

  const handleUpdate = async () => {
    if (!editFolder) {
      return;
    }

    const name = normalizeName(editName);
    if (!name) {
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: editFolder.id, name });
      toast({ title: "Folder updated" });
      setEditFolder(null);
      setEditName("");
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to update folder",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Folders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>New folder</Label>
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. 2025 / Taxes" />
              <Button type="button" onClick={handleCreate} disabled={!canCreate || createMutation.isPending}>
                Create
              </Button>
            </div>
          </div>

          {foldersQuery.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

          <div className="grid gap-3">
            {folders.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">Updated {new Date(f.updatedAt).toLocaleString()}</div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" onClick={() => openEdit(f)}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit folder</DialogTitle>
                      </DialogHeader>

                      <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditFolder(null)}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Receipts in this folder will be moved to "Unassigned".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(f.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}

            {!foldersQuery.isLoading && folders.length === 0 && (
              <div className="text-sm text-muted-foreground">No folders yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
