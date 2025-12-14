import type { OCRResponse } from "@/types/ocr";

export interface Receipt {
  id: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  originalFileName: string;
  mimeType: string;
  imageBlob: Blob;
  ocr: OCRResponse | null;
}
