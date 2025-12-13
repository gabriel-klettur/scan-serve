import { create } from 'zustand';
import { OCRResponse, UploadStatus, BoundingBox } from '@/types/ocr';

interface OCRStore {
  status: UploadStatus;
  originalImage: string | null;
  result: OCRResponse | null;
  error: string | null;
  showBoundingBoxes: boolean;
  selectedBox: BoundingBox | null;
  
  // Actions
  setStatus: (status: UploadStatus) => void;
  setOriginalImage: (image: string | null) => void;
  setResult: (result: OCRResponse | null) => void;
  setError: (error: string | null) => void;
  toggleBoundingBoxes: () => void;
  setSelectedBox: (box: BoundingBox | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as UploadStatus,
  originalImage: null,
  result: null,
  error: null,
  showBoundingBoxes: true,
  selectedBox: null,
};

export const useOCRStore = create<OCRStore>((set) => ({
  ...initialState,
  
  setStatus: (status) => set({ status }),
  setOriginalImage: (originalImage) => set({ originalImage }),
  setResult: (result) => set({ result, status: result ? 'success' : 'idle' }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  toggleBoundingBoxes: () => set((state) => ({ showBoundingBoxes: !state.showBoundingBoxes })),
  setSelectedBox: (selectedBox) => set({ selectedBox }),
  reset: () => set(initialState),
}));
