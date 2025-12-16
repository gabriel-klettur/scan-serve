import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReceiptFoldersQuery } from "../hooks/useReceiptFolders";
import { useReceiptsQuery } from "../hooks/useReceipts";
import type { Receipt } from "../types/receipt";
import { ReceiptListItem } from "./ReceiptListItem";
import { FolderTreeExplorer, type ExplorerFolderSelection } from "./FolderTreeExplorer";

const matchesQuery = (receipt: Receipt, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const name = receipt.originalFileName.toLowerCase();
  const ocr = (receipt.ocr?.text_raw ?? "").toLowerCase();

  return name.includes(q) || ocr.includes(q);
};

export const ReceiptExplorerTab = () => {
  const foldersQuery = useReceiptFoldersQuery();
  const receiptsQuery = useReceiptsQuery(undefined);

  const folders = foldersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];

  const [selection, setSelection] = useState<ExplorerFolderSelection>({ type: "all" });
  const [query, setQuery] = useState("");

  const filteredReceipts = useMemo(() => {
    const folderFiltered = (() => {
      if (selection.type === "all") return receipts;
      if (selection.type === "unassigned") return receipts.filter((r) => r.folderId === null);
      return receipts.filter((r) => r.folderId === selection.folderId);
    })();

    return folderFiltered.filter((r) => matchesQuery(r, query));
  }, [query, receipts, selection]);

  return (
    <Card className="min-h-[70vh]">
      <CardHeader>
        <CardTitle className="text-lg">Explorer</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0">
        <div className="grid gap-4 lg:[grid-template-columns:320px_1fr] min-h-[62vh]">
          <div className="min-h-0">
            <FolderTreeExplorer selection={selection} onChangeSelection={setSelection} />
          </div>

          <div className="min-h-0 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search scans (filename or OCR text)…"
                  className="pl-9"
                />
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredReceipts.length} result{filteredReceipts.length === 1 ? "" : "s"}
              </div>
            </div>

            <Separator className="my-4" />

            {receiptsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}

            {!receiptsQuery.isLoading && filteredReceipts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No receipts found.</div>
            ) : null}

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pr-2">
                <div className="grid gap-4">
                  {filteredReceipts.map((r) => (
                    <ReceiptListItem key={r.id} receipt={r} folders={folders} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
