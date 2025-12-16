import { Link } from "react-router-dom";
import { CreditCard, Folder, FolderOpen, History, Scan } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReceiptHistoryTab } from "@/features/receipts/components/ReceiptHistoryTab";
import { FoldersTab } from "@/features/receipts/components/FoldersTab";

const Receipts = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="relative border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Scan className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">ReceiptVision</h1>
                <p className="text-xs text-muted-foreground">AI-Powered OCR</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link to="/">
                  <Scan className="w-4 h-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link to="/receipts">
                  <FolderOpen className="w-4 h-4" />
                  Receipts
                </Link>
              </Button>
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link to="/pricing">
                  <CreditCard className="w-4 h-4" />
                  Pricing
                </Link>
              </Button>
            </div>
          </div>

          <div className="text-lg font-bold text-foreground">Receipts</div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Local Receipts (IndexedDB)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto">
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="folders" className="gap-2">
                  <Folder className="w-4 h-4" />
                  Folders
                </TabsTrigger>
              </TabsList>
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
