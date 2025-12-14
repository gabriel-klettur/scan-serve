import { useCallback, useState, type ChangeEventHandler } from "react";
import { Upload, Smartphone, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { validateImageFile, fileToDataUrl } from "@/utils/image";
import { getMockOCRResponse } from "@/services/api";
import { CameraCapture } from "./CameraCapture";
import { useReceiptFoldersQuery } from "../hooks/useReceiptFolders";
import { useCreateReceiptMutation } from "../hooks/useReceipts";
import { useObjectUrl } from "../utils/objectUrl";

const UNASSIGNED_VALUE = "__unassigned__";

export const ReceiptUploadTab = () => {
  const foldersQuery = useReceiptFoldersQuery();
  const createReceiptMutation = useCreateReceiptMutation();

  const [folderValue, setFolderValue] = useState<string>(UNASSIGNED_VALUE);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewUrl = useObjectUrl(file);

  const folderId = folderValue === UNASSIGNED_VALUE ? null : folderValue;

  const reset = useCallback(() => {
    setFile(null);
    setValidationError(null);
  }, []);

  const handleFile = useCallback((incoming: File) => {
    const validation = validateImageFile(incoming);
    if (!validation.valid) {
      setValidationError(validation.error ?? "Invalid file");
      return;
    }

    setValidationError(null);
    setFile(incoming);
  }, []);

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const incoming = e.target.files?.[0];
      if (!incoming) {
        return;
      }
      handleFile(incoming);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleSave = useCallback(async () => {
    if (!file) {
      setValidationError("Please select an image first");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const ocr = getMockOCRResponse(dataUrl);

      await createReceiptMutation.mutateAsync({
        folderId,
        file,
        ocr,
      });

      toast({
        title: "Receipt saved",
        description: "Stored locally in IndexedDB.",
      });

      reset();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unable to save receipt",
        variant: "destructive",
      });
    }
  }, [createReceiptMutation, file, folderId, reset]);

  const isBusy = createReceiptMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload / Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={folderValue} onValueChange={setFolderValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                {(foldersQuery.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Choose file</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                disabled={isBusy}
              />
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                disabled={isBusy}
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>The second input hints mobile browsers to open the camera.</span>
            </div>
          </div>

          {validationError && <div className="text-sm text-destructive">{validationError}</div>}

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-border bg-card">
              <img src={previewUrl} alt="Receipt preview" className="w-full h-auto max-h-[340px] object-contain" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset} disabled={isBusy}>
              Reset
            </Button>
            <Button type="button" onClick={handleSave} disabled={isBusy || !file}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="w-4 h-4" />
          <span>Direct camera capture (requires camera permissions)</span>
        </div>
        <CameraCapture disabled={isBusy} onCapture={handleFile} />
      </div>
    </div>
  );
};
