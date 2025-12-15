import { create } from 'zustand';
import { OCRResponse, UploadStatus, BoundingBox, AiReceiptParseResponse } from '@/types/ocr';

interface OCRStore {
  status: UploadStatus;
  originalImage: string | null;
  result: OCRResponse | null;
  error: string | null;
  aiStatus: UploadStatus;
  aiResult: AiReceiptParseResponse | null;
  aiError: string | null;
  showBoundingBoxes: boolean;
  selectedBox: BoundingBox | null;
  
  // Actions
  setStatus: (status: UploadStatus) => void;
  setOriginalImage: (image: string | null) => void;
  setResult: (result: OCRResponse | null) => void;
  setError: (error: string | null) => void;
  setAiStatus: (status: UploadStatus) => void;
  setAiResult: (result: AiReceiptParseResponse | null) => void;
  setAiError: (error: string | null) => void;
  resetAi: () => void;
  toggleBoundingBoxes: () => void;
  setSelectedBox: (box: BoundingBox | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as UploadStatus,
  originalImage: null,
  result: null,
  error: null,
  aiStatus: 'idle' as UploadStatus,
  aiResult: null as AiReceiptParseResponse | null,
  aiError: null as string | null,
  showBoundingBoxes: true,
  selectedBox: null,
};

export const useOCRStore = create<OCRStore>((set) => ({
  ...initialState,
  
  setStatus: (status) => set({ status }),
  setOriginalImage: (originalImage) => set({ originalImage }),
  setResult: (result) =>
    set({
      result,
      status: result ? 'success' : 'idle',
      aiStatus: 'idle',
      aiResult: null,
      aiError: null,
    }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  setAiStatus: (aiStatus) => set({ aiStatus }),
  setAiResult: (aiResult) => set({ aiResult, aiStatus: aiResult ? 'success' : 'idle' }),
  setAiError: (aiError) => set({ aiError, aiStatus: aiError ? 'error' : 'idle' }),
  resetAi: () => set({ aiStatus: 'idle', aiResult: null, aiError: null }),
  toggleBoundingBoxes: () => set((state) => ({ showBoundingBoxes: !state.showBoundingBoxes })),
  setSelectedBox: (selectedBox) => set({ selectedBox }),
  reset: () => set(initialState),
}));
