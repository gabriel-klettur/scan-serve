import { Files, Folder, LayoutPanelLeft, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/navigation/AppHeader";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/hooks/use-toast";
import { ReceiptHistoryTab } from "@/features/receipts/components/ReceiptHistoryTab";
import { FoldersTab } from "@/features/receipts/components/FoldersTab";
import { ReceiptExplorerTab } from "@/features/receipts/components/ReceiptExplorerTab";
import { useDeleteAllReceiptsMutation } from "@/features/receipts/hooks/useReceipts";

const Receipts = () => {
  const deleteAllMutation = useDeleteAllReceiptsMutation();

  const handleDeleteAll = async () => {
    try {
      await deleteAllMutation.mutateAsync();
      toast({
        title: "Deleted",
        description: "All receipts were removed from local storage.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to delete receipts",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader rightContent="Files" />

      <main className="relative container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan History (IndexedDB)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="explorer" className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-2">
                <TabsTrigger value="explorer" className="gap-2">
                  <LayoutPanelLeft className="w-4 h-4" />
                  Explorer
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <Files className="w-4 h-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="folders" className="gap-2">
                  <Folder className="w-4 h-4" />
                  Folders
                </TabsTrigger>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="ml-auto gap-2"
                      disabled={deleteAllMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all receipts?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove every receipt stored locally in IndexedDB. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteAllMutation.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAll}
                        disabled={deleteAllMutation.isPending}
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsList>
              <TabsContent value="explorer">
                <ReceiptExplorerTab />
              </TabsContent>
              <TabsContent value="history">
                <ReceiptHistoryTab />
              </TabsContent>
              <TabsContent value="folders">
                <FoldersTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Receipts;
