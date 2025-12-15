import axios from 'axios';
import { OCRResponse, AiReceiptParseResponse } from '@/types/ocr';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ServerReceipt {
  id: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  originalFileName: string;
  mimeType: string;
  image_url: string;
  ocr: OCRResponse | null;
}

const toAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return new URL(url, API_BASE_URL).toString();
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for OCR processing
});

export const uploadImageForOCR = async (file: File): Promise<OCRResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<OCRResponse>('/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const parseReceiptWithAI = async (payload: {
  text_raw: string;
  fields?: OCRResponse['fields'];
  boxes?: OCRResponse['boxes'];
}): Promise<AiReceiptParseResponse> => {
  const response = await apiClient.post<AiReceiptParseResponse>('/ocr/ai/parse', payload, {
    timeout: 180000,
  });
  return response.data;
};

export type AiParseStreamEvent =
  | { type: 'pipeline_start'; agents?: Record<string, string> }
  | { type: 'stage_start'; stage: string; agent?: string }
  | { type: 'stage_end'; stage: string; agent?: string }
  | { type: 'handoff'; from_stage: string; to_stage: string; from_agent?: string; to_agent?: string }
  | { type: 'note'; stage?: string; agent?: string; text: string }
  | { type: 'result'; data: AiReceiptParseResponse }
  | { type: 'pipeline_done'; elapsed_ms?: number }
  | { type: 'error'; detail?: string };

export const parseReceiptWithAIStream = async (
  payload: {
    text_raw: string;
    fields?: OCRResponse['fields'];
    boxes?: OCRResponse['boxes'];
  },
  onEvent: (event: AiParseStreamEvent) => void,
): Promise<AiReceiptParseResponse> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(`${API_BASE_URL}/ocr/ai/parse/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body?.detail || detail;
      } catch {
        // ignore
      }
      throw new Error(detail);
    }

    if (!res.body) {
      throw new Error('Streaming response not supported by the browser');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult: AiReceiptParseResponse | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let evt: AiParseStreamEvent;
        try {
          evt = JSON.parse(trimmed) as AiParseStreamEvent;
        } catch {
          continue;
        }

        onEvent(evt);

        if (evt.type === 'error') {
          throw new Error(evt.detail || 'AI parse failed');
        }
        if (evt.type === 'result') {
          finalResult = evt.data;
        }
      }
    }

    if (!finalResult) {
      throw new Error('AI parse finished without a result');
    }
    return finalResult;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export type OcrEngine = 'easyocr' | 'vision' | 'both';

export const createReceiptOnServer = async (file: File, ocrEngine: OcrEngine = 'easyocr'): Promise<OCRResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('runOcr', 'true');
  formData.append('ocrEngine', ocrEngine);

  const response = await apiClient.post<ServerReceipt>('/api/v1/receipts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const receipt = response.data;
  if (!receipt.ocr) {
    throw new Error('OCR was not returned by the backend');
  }

  return {
    ...receipt.ocr,
    original_image_url: toAbsoluteUrl(receipt.ocr.original_image_url),
    processed_image_url: toAbsoluteUrl(receipt.ocr.processed_image_url),
  };
};

// Mock data for demo mode
export const getMockOCRResponse = (imageUrl: string): OCRResponse => ({
  original_image_url: imageUrl,
  processed_image_url: imageUrl,
  text_raw: `SUPERMERCADO METRO
Av. Principal 1234
Lima, Perú

FACTURA SIMPLIFICADA

Leche Gloria 1L          S/. 4.50
Pan Integral              S/. 3.20
Arroz Extra 1kg           S/. 4.80
Aceite Primor 1L          S/. 8.90
Huevos x12               S/. 7.50
Pollo 1.5kg              S/. 18.00
Verduras variadas        S/. 12.30

SUBTOTAL                 S/. 59.20
IGV (18%)                S/. 10.66
------------------------
TOTAL                    S/. 69.86

Fecha: 13/12/2024
Hora: 14:35

¡Gracias por su compra!`,
  confidence_avg: 94.5,
  fields: {
    total: 69.86,
    date: '13/12/2024',
    merchant: 'SUPERMERCADO METRO',
  },
  boxes: [
    { text: 'SUPERMERCADO METRO', bbox: [[50, 20], [350, 20], [350, 50], [50, 50]], confidence: 98 },
    { text: 'Av. Principal 1234', bbox: [[80, 55], [320, 55], [320, 75], [80, 75]], confidence: 95 },
    { text: 'TOTAL S/. 69.86', bbox: [[50, 380], [350, 380], [350, 410], [50, 410]], confidence: 97 },
    { text: 'Fecha: 13/12/2024', bbox: [[50, 420], [250, 420], [250, 445], [50, 445]], confidence: 96 },
    { text: 'Leche Gloria 1L S/. 4.50', bbox: [[50, 120], [350, 120], [350, 145], [50, 145]], confidence: 93 },
    { text: 'Pan Integral S/. 3.20', bbox: [[50, 150], [350, 150], [350, 175], [50, 175]], confidence: 91 },
  ],
});
