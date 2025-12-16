import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, X, FileImage, Folder, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ScanResultTab } from '@/store/scanResultsStore';

interface OverflowMenuProps {
  tabs: ScanResultTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Overflow menu component that displays additional scanned receipt tabs
 * in a dropdown with preview cards.
 */
export const OverflowMenu = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onClearAll,
}: OverflowMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (tabs.length === 0) return null;

  const handleSelectTab = (id: string) => {
    onSelectTab(id);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 px-2 gap-1 border border-border hover:border-primary/30',
            isOpen && 'border-primary/50 bg-primary/10'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-xs font-medium">{tabs.length}+</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 border-border bg-card/95 backdrop-blur-xl"
        sideOffset={8}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            More Scanned Receipts
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              onClearAll();
              setIsOpen(false);
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>

        <ScrollArea className="max-h-[320px]">
          <div className="p-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <OverflowCard
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onSelect={() => handleSelectTab(tab.id)}
                    onClose={() => onCloseTab(tab.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

interface OverflowCardProps {
  tab: ScanResultTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

/**
 * Individual card component for the overflow menu.
 * Displays a larger preview image, filename, folder, and timestamp.
 */
const OverflowCard = ({
  tab,
  isActive,
  onSelect,
  onClose,
}: OverflowCardProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const merchantName =
    tab.ocrResult?.fields?.merchant ||
    tab.aiResult?.fields?.merchant ||
    'Unknown Merchant';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 p-2 rounded-lg transition-all duration-200 group',
        'hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'bg-primary/10 border border-primary/30'
      )}
    >
      {/* Preview Image */}
      <div className="w-12 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0 border border-border">
        {tab.thumbnailUrl ? (
          <img
            src={tab.thumbnailUrl}
            alt={tab.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileImage className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">
          {merchantName}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {tab.fileName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {tab.folder && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Folder className="w-3 h-3" />
              {tab.folder}
            </span>
          )}
          <span className="text-xs text-muted-foreground/60">
            {formatDate(tab.createdAt)}
          </span>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          'w-6 h-6 rounded flex items-center justify-center transition-colors flex-shrink-0',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          'hover:bg-destructive/20 hover:text-destructive text-muted-foreground'
        )}
        aria-label={`Close ${tab.fileName}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </button>
  );
};
