export interface BoundingBox {
  text: string;
  bbox: number[][];
  confidence: number;
}

export interface OCRFields {
  total?: number;
  date?: string;
  merchant?: string;
}

export interface OCRResponse {
  original_image_url: string;
  processed_image_url: string;
  text_raw: string;
  confidence_avg: number;
  fields: OCRFields;
  boxes: BoundingBox[];
}

export interface AiReceiptParseResponse {
  fields: OCRFields;
  text_clean: string;
  markdown: string;
  data: Record<string, unknown>;
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface OCRState {
  status: UploadStatus;
  originalImage: string | null;
  result: OCRResponse | null;
  error: string | null;
  showBoundingBoxes: boolean;
  selectedBox: BoundingBox | null;
}
