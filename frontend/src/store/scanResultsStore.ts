import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OCRResponse, AiReceiptParseResponse } from '@/types/ocr';

/**
 * Represents a single scanned receipt result tab.
 * Each tab contains the scan result data, preview image, and metadata.
 */
export interface ScanResultTab {
  id: string;
  fileName: string;
  thumbnailUrl: string;
  originalImageUrl: string;
  ocrResult: OCRResponse;
  aiResult?: AiReceiptParseResponse | null;
  aiStageResults?: Record<string, AiReceiptParseResponse>;
  createdAt: number;
  folder?: string;
}

interface ScanResultsStore {
  tabs: ScanResultTab[];
  activeTabId: string | null;
  maxVisibleTabs: number;

  // Actions
  addTab: (tab: Omit<ScanResultTab, 'id' | 'createdAt'>) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateTab: (id: string, updates: Partial<ScanResultTab>) => void;
  clearAllTabs: () => void;
  setMaxVisibleTabs: (count: number) => void;
  getVisibleTabs: () => ScanResultTab[];
  getOverflowTabs: () => ScanResultTab[];
}

/**
 * Generates a unique ID for a new tab.
 */
const generateTabId = (): string => {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Extracts a short filename from a full path or URL.
 */
const extractShortName = (fileName: string): string => {
  const baseName = fileName.split('/').pop()?.split('\\').pop() || fileName;
  if (baseName.length > 20) {
    const ext = baseName.includes('.') ? baseName.split('.').pop() : '';
    const name = baseName.slice(0, 15);
    return ext ? `${name}...${ext}` : `${name}...`;
  }
  return baseName;
};

export const useScanResultsStore = create<ScanResultsStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      maxVisibleTabs: 3,

      addTab: (tabData) => {
        const id = generateTabId();
        const newTab: ScanResultTab = {
          ...tabData,
          id,
          fileName: extractShortName(tabData.fileName),
          createdAt: Date.now(),
        };

        set((state) => ({
          tabs: [newTab, ...state.tabs],
          activeTabId: id,
        }));

        return id;
      },

      removeTab: (id) => {
        set((state) => {
          const filteredTabs = state.tabs.filter((tab) => tab.id !== id);
          const newActiveId =
            state.activeTabId === id
              ? filteredTabs[0]?.id ?? null
              : state.activeTabId;

          return {
            tabs: filteredTabs,
            activeTabId: newActiveId,
          };
        });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },

      updateTab: (id, updates) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id ? { ...tab, ...updates } : tab
          ),
        }));
      },

      clearAllTabs: () => {
        set({ tabs: [], activeTabId: null });
      },

      setMaxVisibleTabs: (count) => {
        set({ maxVisibleTabs: count });
      },

      getVisibleTabs: () => {
        const { tabs, maxVisibleTabs } = get();
        return tabs.slice(0, maxVisibleTabs);
      },

      getOverflowTabs: () => {
        const { tabs, maxVisibleTabs } = get();
        return tabs.slice(maxVisibleTabs);
      },
    }),
    {
      name: 'scan-results-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
