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
  aiStageResults: Record<string, AiReceiptParseResponse>;
  aiSelectedStage: string | null;
  aiAutoFollowStage: boolean;
  aiStagePulseKey: number;
  aiStagePulseStage: string | null;
  aiActiveStageKey: string | null;
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
  mergeAiStageResult: (stage: string, data: AiReceiptParseResponse) => void;
  resetAiStages: () => void;
  setAiSelectedStage: (stage: string | null) => void;
  setAiAutoFollowStage: (enabled: boolean) => void;
  pulseAiStage: (stage: string) => void;
  setAiActiveStageKey: (stage: string | null) => void;
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
  aiStageResults: {} as Record<string, AiReceiptParseResponse>,
  aiSelectedStage: null as string | null,
  aiAutoFollowStage: true,
  aiStagePulseKey: 0,
  aiStagePulseStage: null as string | null,
  aiActiveStageKey: null as string | null,
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
      aiStageResults: {},
      aiSelectedStage: null,
      aiAutoFollowStage: true,
      aiStagePulseKey: 0,
      aiStagePulseStage: null,
      aiActiveStageKey: null,
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
  mergeAiStageResult: (stage, data) =>
    set((state) => ({
      aiStageResults: {
        ...state.aiStageResults,
        [stage]: data,
      },
    })),
  resetAiStages: () =>
    set({
      aiStageResults: {},
      aiSelectedStage: null,
      aiAutoFollowStage: true,
      aiStagePulseKey: 0,
      aiStagePulseStage: null,
      aiActiveStageKey: null,
    }),
  setAiSelectedStage: (aiSelectedStage) => set({ aiSelectedStage }),
  setAiAutoFollowStage: (aiAutoFollowStage) => set({ aiAutoFollowStage }),
  pulseAiStage: (stage) =>
    set((state) => ({
      aiStagePulseKey: state.aiStagePulseKey + 1,
      aiStagePulseStage: stage,
    })),
  setAiActiveStageKey: (aiActiveStageKey) => set({ aiActiveStageKey }),
  resetAi: () =>
    set({
      aiStatus: 'idle',
      aiResult: null,
      aiError: null,
      aiStageResults: {},
      aiSelectedStage: null,
      aiAutoFollowStage: true,
      aiStagePulseKey: 0,
      aiStagePulseStage: null,
      aiActiveStageKey: null,
    }),
  toggleBoundingBoxes: () => set((state) => ({ showBoundingBoxes: !state.showBoundingBoxes })),
  setHoveredBoxIndex: (hoveredBoxIndex) => set({ hoveredBoxIndex }),
  setSelectedBoxIndex: (selectedBoxIndex) => set({ selectedBoxIndex }),
  reset: () => set(initialState),
}));
