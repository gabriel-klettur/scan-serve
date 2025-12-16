import { motion } from 'framer-motion';
import { X, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanResultTab as ScanResultTabType } from '@/store/scanResultsStore';

interface ScanResultTabProps {
  tab: ScanResultTabType;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

/**
 * Individual tab component for a scanned receipt result.
 * Displays a thumbnail, filename, and close button.
 */
export const ScanResultTab = ({
  tab,
  isActive,
  onSelect,
  onClose,
}: ScanResultTabProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={cn(
        'relative flex items-center gap-2 h-9 pl-2 pr-1 rounded-lg text-sm font-medium transition-all duration-200 border group',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
        isActive
          ? 'border-primary/50 bg-primary/10 text-foreground shadow-glow'
          : 'border-border bg-card/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-primary/30'
      )}
    >
      {/* Thumbnail */}
      <div className="w-5 h-5 rounded overflow-hidden bg-secondary flex-shrink-0">
        {tab.thumbnailUrl ? (
          <img
            src={tab.thumbnailUrl}
            alt={tab.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileImage className="w-3 h-3 m-1 text-muted-foreground" />
        )}
      </div>

      {/* Filename */}
      <span className="max-w-[80px] truncate text-xs">{tab.fileName}</span>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          'hover:bg-destructive/20 hover:text-destructive',
          isActive && 'opacity-60'
        )}
        aria-label={`Close ${tab.fileName}`}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Active indicator */}
      {isActive && (
        <motion.span
          layoutId="scanTabIndicator"
          className="absolute -bottom-[7px] left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary/70 shadow-glow"
        />
      )}
    </motion.button>
  );
};
