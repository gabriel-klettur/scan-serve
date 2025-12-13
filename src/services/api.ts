import axios from 'axios';
import { OCRResponse } from '@/types/ocr';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
