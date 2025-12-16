import { useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScanResultsStore } from '@/store/scanResultsStore';
import { useOCRStore } from '@/store/ocrStore';
import { ScanResultTab } from './ScanResultTab';
import { OverflowMenu } from './OverflowMenu';

/**
 * Main component that renders the scan result tabs in the header.
 * Displays visible tabs with an overflow menu for additional tabs.
 */
export const ScanResultTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    tabs,
    activeTabId,
    maxVisibleTabs,
    setActiveTab,
    removeTab,
    clearAllTabs,
    getVisibleTabs,
    getOverflowTabs,
  } = useScanResultsStore();

  const {
    setOriginalImage,
    setResult,
    setAiResult,
    setStatus,
  } = useOCRStore();

  useEffect(() => {
    if (location.pathname !== '/results') return;
    if (!activeTabId) return;

    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    setOriginalImage(tab.originalImageUrl);
    setResult(tab.ocrResult);
    setAiResult(tab.aiResult ?? null);
    setStatus('success');
  }, [activeTabId, location.pathname, setAiResult, setOriginalImage, setResult, setStatus, tabs]);

  const visibleTabs = getVisibleTabs();
  const overflowTabs = getOverflowTabs();

  /**
   * Loads the selected tab's data into the OCR store and navigates to results.
   */
  const handleSelectTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      // Load tab data into OCR store
      setOriginalImage(tab.originalImageUrl);
      setResult(tab.ocrResult);
      setAiResult(tab.aiResult ?? null);
      setStatus('success');

      // Set active tab
      setActiveTab(tabId);

      // Navigate to results if not already there
      if (location.pathname !== '/results') {
        navigate('/results');
      }
    },
    [tabs, setOriginalImage, setResult, setAiResult, setStatus, setActiveTab, navigate, location.pathname]
  );

  /**
   * Removes a tab and clears OCR store if it was the active tab.
   */
  const handleCloseTab = useCallback(
    (tabId: string) => {
      const isActive = tabId === activeTabId;
      const tabIndex = tabs.findIndex((t) => t.id === tabId);

      removeTab(tabId);

      // If closing active tab, load the next available tab or clear store
      if (isActive) {
        const remainingTabs = tabs.filter((t) => t.id !== tabId);
        if (remainingTabs.length > 0) {
          // Select the next tab in sequence or the last one
          const nextTab = remainingTabs[Math.min(tabIndex, remainingTabs.length - 1)];
          handleSelectTab(nextTab.id);
        } else {
          // No tabs left, navigate home
          navigate('/');
        }
      }
    },
    [activeTabId, tabs, removeTab, handleSelectTab, navigate]
  );

  /**
   * Clears all tabs and resets state.
   */
  const handleClearAll = useCallback(() => {
    clearAllTabs();
    navigate('/');
  }, [clearAllTabs, navigate]);

  // Don't render if there are no tabs
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Visible Tabs */}
      <AnimatePresence mode="popLayout">
        {visibleTabs.map((tab) => (
          <ScanResultTab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => handleSelectTab(tab.id)}
            onClose={() => handleCloseTab(tab.id)}
          />
        ))}
      </AnimatePresence>

      {/* Overflow Menu */}
      <OverflowMenu
        tabs={overflowTabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onClearAll={handleClearAll}
      />
    </div>
  );
};
