import { create } from 'zustand';
import { OCRResponse, UploadStatus, AiReceiptParseResponse } from '@/types/ocr';

interface OCRStore {
  status: UploadStatus;
  originalImage: string | null;
  result: OCRResponse | null;
  error: string | null;
  queueStatus: string | null;
  queuePosition: number | null;
  aiStatus: UploadStatus;
  aiResult: AiReceiptParseResponse | null;
  aiError: string | null;
  showBoundingBoxes: boolean;
  hoveredBoxIndex: number | null;
  selectedBoxIndex: number | null;
  
  // Actions
  setStatus: (status: UploadStatus) => void;
  setOriginalImage: (image: string | null) => void;
  setResult: (result: OCRResponse | null) => void;
  setError: (error: string | null) => void;
  setQueueInfo: (queueStatus: string | null, queuePosition: number | null) => void;
  setAiStatus: (status: UploadStatus) => void;
  setAiResult: (result: AiReceiptParseResponse | null) => void;
  setAiError: (error: string | null) => void;
  resetAi: () => void;
  toggleBoundingBoxes: () => void;
  setHoveredBoxIndex: (index: number | null) => void;
  setSelectedBoxIndex: (index: number | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as UploadStatus,
  originalImage: null,
  result: null,
  error: null,
  queueStatus: null as string | null,
  queuePosition: null as number | null,
  aiStatus: 'idle' as UploadStatus,
  aiResult: null as AiReceiptParseResponse | null,
  aiError: null as string | null,
  showBoundingBoxes: true,
  hoveredBoxIndex: null,
  selectedBoxIndex: null,
};

export const useOCRStore = create<OCRStore>((set) => ({
  ...initialState,
  
  setStatus: (status) => set({ status }),
  setOriginalImage: (originalImage) => set({ originalImage }),
  setResult: (result) =>
    set({
      result,
      status: result ? 'success' : 'idle',
      queueStatus: null,
      queuePosition: null,
      aiStatus: 'idle',
      aiResult: null,
      aiError: null,
      hoveredBoxIndex: null,
      selectedBoxIndex: null,
    }),
  setError: (error) =>
    set({
      error,
      status: error ? 'error' : 'idle',
      queueStatus: null,
      queuePosition: null,
    }),
  setQueueInfo: (queueStatus, queuePosition) => set({ queueStatus, queuePosition }),
  setAiStatus: (aiStatus) => set({ aiStatus }),
  setAiResult: (aiResult) => set({ aiResult, aiStatus: aiResult ? 'success' : 'idle' }),
  setAiError: (aiError) => set({ aiError, aiStatus: aiError ? 'error' : 'idle' }),
  resetAi: () => set({ aiStatus: 'idle', aiResult: null, aiError: null }),
  toggleBoundingBoxes: () => set((state) => ({ showBoundingBoxes: !state.showBoundingBoxes })),
  setHoveredBoxIndex: (hoveredBoxIndex) => set({ hoveredBoxIndex }),
  setSelectedBoxIndex: (selectedBoxIndex) => set({ selectedBoxIndex }),
  reset: () => set(initialState),
}));
