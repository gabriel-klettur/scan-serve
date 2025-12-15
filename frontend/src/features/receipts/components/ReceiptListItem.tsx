import { useEffect, useMemo, useState } from "react";
import { Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createReceiptOnServer, type OcrEngine } from "@/services/api";
import type { ReceiptFolder } from "../types/folder";
import type { Receipt } from "../types/receipt";
import { useObjectUrl } from "../utils/objectUrl";
import { useDeleteReceiptMutation, useUpdateReceiptFolderMutation, useUpdateReceiptOcrMutation } from "../hooks/useReceipts";

const UNASSIGNED_VALUE = "__unassigned__";

interface ReceiptListItemProps {
  receipt: Receipt;
  folders: ReceiptFolder[];
}

export const ReceiptListItem = ({ receipt, folders }: ReceiptListItemProps) => {
  const deleteMutation = useDeleteReceiptMutation();
  const updateFolderMutation = useUpdateReceiptFolderMutation();
  const updateOcrMutation = useUpdateReceiptOcrMutation();

  type ReceiptOcrEngine = Extract<OcrEngine, "easyocr" | "vision">;
  const [ocrEngine, setOcrEngine] = useState<ReceiptOcrEngine>("vision");
  const [currentOcrText, setCurrentOcrText] = useState<string>(receipt.ocr?.text_raw ?? "No OCR data");
  const [isReprocessingOcr, setIsReprocessingOcr] = useState(false);

  const imageUrl = useObjectUrl(receipt.imageBlob);

  const folderValue = receipt.folderId ?? UNASSIGNED_VALUE;

  const createdLabel = useMemo(() => new Date(receipt.createdAt).toLocaleString(), [receipt.createdAt]);

  useEffect(() => {
    setCurrentOcrText(receipt.ocr?.text_raw ?? "No OCR data");
  }, [receipt.ocr?.text_raw]);

  const rerunOcr = async (engine: ReceiptOcrEngine) => {
    setOcrEngine(engine);
    setIsReprocessingOcr(true);
    try {
      const file = new File([receipt.imageBlob], receipt.originalFileName, { type: receipt.mimeType });
      const ocr = await createReceiptOnServer(file, engine);
      await updateOcrMutation.mutateAsync({ receiptId: receipt.id, ocr });
      setCurrentOcrText(ocr.text_raw);
      toast({
        title: "OCR updated",
        description: `Reprocessed with ${engine === "vision" ? "Google Vision" : "EasyOCR"}.`,
      });
    } catch (e) {
      toast({
        title: "OCR error",
        description: e instanceof Error ? e.message : "Unable to reprocess OCR",
        variant: "destructive",
      });
    } finally {
      setIsReprocessingOcr(false);
    }
  };

  const handleFolderChange = async (value: string) => {
    const folderId = value === UNASSIGNED_VALUE ? null : value;

    try {
      await updateFolderMutation.mutateAsync({
        receiptId: receipt.id,
        folderId,
      });

      toast({
        title: "Updated",
        description: "Receipt moved successfully.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to move receipt",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(receipt.id);
      toast({
        title: "Deleted",
        description: "Receipt removed from local storage.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to delete receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="rounded-lg overflow-hidden border border-border bg-card">
          {imageUrl ? (
            <img src={imageUrl} alt={receipt.originalFileName} className="w-full h-[120px] object-cover" />
          ) : (
            <div className="w-full h-[120px] bg-muted" />
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="font-medium text-foreground">{receipt.originalFileName}</div>
            <div className="text-xs text-muted-foreground">{createdLabel}</div>
          </div>

          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={folderValue} onValueChange={handleFolderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Receipt</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl overflow-hidden border border-border bg-card">
                    {imageUrl && <img src={imageUrl} alt={receipt.originalFileName} className="w-full h-auto object-contain" />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">OCR</div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant={ocrEngine === "easyocr" ? "secondary" : "outline"}
                          size="sm"
                          disabled={isReprocessingOcr}
                          onClick={() => rerunOcr("easyocr")}
                        >
                          {isReprocessingOcr && ocrEngine === "easyocr" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          EasyOCR
                        </Button>
                        <Button
                          type="button"
                          variant={ocrEngine === "vision" ? "secondary" : "outline"}
                          size="sm"
                          disabled={isReprocessingOcr}
                          onClick={() => rerunOcr("vision")}
                        >
                          {isReprocessingOcr && ocrEngine === "vision" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Google Vision
                        </Button>
                      </div>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 max-h-[420px] overflow-auto">
                      {currentOcrText}
                    </pre>
                  </div>
                </div>
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
                  <AlertDialogTitle>Delete receipt?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
