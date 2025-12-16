import { Folder, History, LayoutPanelLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/navigation/AppHeader";
import { ReceiptHistoryTab } from "@/features/receipts/components/ReceiptHistoryTab";
import { FoldersTab } from "@/features/receipts/components/FoldersTab";
import { ReceiptExplorerTab } from "@/features/receipts/components/ReceiptExplorerTab";

const Receipts = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader rightContent="History" />

      <main className="relative container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan History (IndexedDB)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="explorer" className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto">
                <TabsTrigger value="explorer" className="gap-2">
                  <LayoutPanelLeft className="w-4 h-4" />
                  Explorer
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="folders" className="gap-2">
                  <Folder className="w-4 h-4" />
                  Folders
                </TabsTrigger>
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
