import { useMemo, useState } from "react";
import { FileQuestion, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useReceiptsQuery } from "../hooks/useReceipts";
import type { Receipt } from "../types/receipt";
import { FileTreeExplorer, type FileTreeSelection } from "./FileTreeExplorer";
import { ReceiptPreviewPanel } from "./ReceiptPreviewPanel";

const matchesQuery = (receipt: Receipt, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const name = receipt.originalFileName.toLowerCase();
  const ocr = (receipt.ocr?.text_raw ?? "").toLowerCase();

  return name.includes(q) || ocr.includes(q);
};

export const ReceiptExplorerTab = () => {
  const receiptsQuery = useReceiptsQuery(undefined);
  const receipts = receiptsQuery.data ?? [];

  const [selection, setSelection] = useState<FileTreeSelection>({ type: "none" });
  const [query, setQuery] = useState("");

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => matchesQuery(r, query));
  }, [query, receipts]);

  const selectedReceipt = useMemo(() => {
    if (selection.type !== "file") return null;
    return receipts.find((r) => r.id === selection.receiptId) ?? null;
  }, [receipts, selection]);

  const matchCount = filteredReceipts.length;

  return (
    <Card className="min-h-[70vh] border-border/50 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="grid lg:grid-cols-[260px_1fr] min-h-[70vh]">
          {/* Sidebar: Search + File Tree */}
          <div className="flex flex-col border-r border-border/50 bg-muted/40">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search files…"
                  className="h-8 pl-8 text-sm bg-background/60 border-border/40 focus:bg-background"
                />
              </div>
              {query && (
                <div className="text-xs text-muted-foreground mt-2 px-1">
                  {matchCount} match{matchCount === 1 ? "" : "es"}
                </div>
              )}
            </div>

            <Separator className="opacity-50" />

            <div className="flex-1 min-h-0">
              <FileTreeExplorer
                selection={selection}
                onChangeSelection={setSelection}
              />
            </div>
          </div>

          {/* Main content: Receipt Preview */}
          <div className="flex flex-col min-h-0 bg-background">
            {receiptsQuery.isLoading && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}

            {!receiptsQuery.isLoading && !selectedReceipt && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <FileQuestion className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-sm font-medium">No file selected</p>
                <p className="text-xs text-muted-foreground/70 mt-1 text-center max-w-xs">
                  Select a file from the explorer to preview its contents
                </p>
              </div>
            )}

            {selectedReceipt && <ReceiptPreviewPanel receipt={selectedReceipt} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
