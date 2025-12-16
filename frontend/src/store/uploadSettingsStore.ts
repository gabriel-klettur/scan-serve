import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OcrEngine } from '@/services/api';

export type UploadMode = 'single' | 'multiple';
export type NotificationType = 'none' | 'per-image' | 'all-complete';
export type ProcessingMode = 'parallel' | 'sequential';

/**
 * Processing time estimates (in seconds)
 */
export const PROCESSING_ESTIMATES = {
  ocrOnly: 15, // ~15 seconds for OCR only
  withAiEnhancement: 180, // ~3 minutes with AI Enhancement
} as const;

interface UploadSettingsStore {
  mode: UploadMode;
  // Multiple mode settings
  selectedEngine: OcrEngine;
  applyAiEnhancement: boolean;
  processingMode: ProcessingMode;
  // Email notification settings
  emailNotification: NotificationType;
  notificationEmail: string;
  // Camera settings
  showCamera: boolean;
  
  // Actions
  setMode: (mode: UploadMode) => void;
  setSelectedEngine: (engine: OcrEngine) => void;
  setApplyAiEnhancement: (apply: boolean) => void;
  setProcessingMode: (mode: ProcessingMode) => void;
  setEmailNotification: (type: NotificationType) => void;
  setNotificationEmail: (email: string) => void;
  setShowCamera: (show: boolean) => void;
  toggleCamera: () => void;
  resetSettings: () => void;
}

const initialState = {
  mode: 'single' as UploadMode,
  selectedEngine: 'vision' as OcrEngine,
  applyAiEnhancement: true,
  processingMode: 'parallel' as ProcessingMode,
  emailNotification: 'none' as NotificationType,
  notificationEmail: '',
  showCamera: false,
};

export const useUploadSettingsStore = create<UploadSettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) => set({ mode }),
      setSelectedEngine: (selectedEngine) => set({ selectedEngine }),
      setApplyAiEnhancement: (applyAiEnhancement) => set({ applyAiEnhancement }),
      setProcessingMode: (processingMode) => set({ processingMode }),
      setEmailNotification: (emailNotification) => set({ emailNotification }),
      setNotificationEmail: (notificationEmail) => set({ notificationEmail }),
      setShowCamera: (showCamera) => set({ showCamera }),
      toggleCamera: () => set((state) => ({ showCamera: !state.showCamera })),
      resetSettings: () => set(initialState),
    }),
    {
      name: 'upload-settings',
      partialize: (state) => ({
        selectedEngine: state.selectedEngine,
        applyAiEnhancement: state.applyAiEnhancement,
        processingMode: state.processingMode,
        emailNotification: state.emailNotification,
        notificationEmail: state.notificationEmail,
      }),
    }
  )
);
