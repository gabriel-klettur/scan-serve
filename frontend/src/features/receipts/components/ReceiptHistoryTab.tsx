import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReceiptFoldersQuery } from "../hooks/useReceiptFolders";
import { useReceiptsQuery } from "../hooks/useReceipts";
import { ReceiptListItem } from "./ReceiptListItem";

const FILTER_ALL = "__all__";
const FILTER_UNASSIGNED = "__unassigned__";

export const ReceiptHistoryTab = () => {
  const foldersQuery = useReceiptFoldersQuery();

  const [filter, setFilter] = useState<string>(FILTER_ALL);

  const folderId = useMemo(() => {
    if (filter === FILTER_ALL) {
      return undefined;
    }
    if (filter === FILTER_UNASSIGNED) {
      return null;
    }
    return filter;
  }, [filter]);

  const receiptsQuery = useReceiptsQuery(folderId);

  const folders = foldersQuery.data ?? [];
  const receipts = receiptsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by folder</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>All</SelectItem>
                <SelectItem value={FILTER_UNASSIGNED}>Unassigned</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {receiptsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

          {!receiptsQuery.isLoading && receipts.length === 0 && (
            <div className="text-sm text-muted-foreground">No receipts yet.</div>
          )}

          <div className="grid gap-4">
            {receipts.map((r) => (
              <ReceiptListItem key={r.id} receipt={r} folders={folders} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
