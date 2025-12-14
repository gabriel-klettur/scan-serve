import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useOCRStore } from '@/store/ocrStore';
import { Button } from '@/components/ui/button';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';
import { cn } from '@/lib/utils';

export const BeforeAfterViewer = () => {
  const { result, showBoundingBoxes, toggleBoundingBoxes } = useOCRStore();
  const [activeView, setActiveView] = useState<'original' | 'processed'>('processed');
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  if (!result) return null;

  const imageUrl = activeView === 'original' ? result.original_image_url : result.processed_image_url;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const scale = useMemo(() => {
    if (naturalSize.width <= 0 || naturalSize.height <= 0) {
      return { x: 1, y: 1 };
    }
    if (renderedSize.width <= 0 || renderedSize.height <= 0) {
      return { x: 1, y: 1 };
    }
    return {
      x: renderedSize.width / naturalSize.width,
      y: renderedSize.height / naturalSize.height,
    };
  }, [naturalSize, renderedSize]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const updateRendered = () => {
      setRenderedSize({ width: img.clientWidth, height: img.clientHeight });
    };

    updateRendered();

    const ro = new ResizeObserver(() => updateRendered());
    ro.observe(img);

    return () => ro.disconnect();
  }, [imageUrl]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* View Toggle */}
        <div className="flex rounded-lg border border-border bg-secondary/50 p-1">
          <button
            onClick={() => setActiveView('original')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeView === 'original'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Original
          </button>
          <button
            onClick={() => setActiveView('processed')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              activeView === 'processed'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Processed
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="icon"
            size="icon"
            onClick={toggleBoundingBoxes}
            title={showBoundingBoxes ? "Hide boxes" : "Show boxes"}
          >
            {showBoundingBoxes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="icon" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="icon" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="icon" size="icon" onClick={handleResetZoom}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Viewer */}
      <motion.div
        layout
        className="relative rounded-xl border border-border bg-card overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        <div className="overflow-auto max-h-[500px] p-4">
          <div
            className="relative mx-auto transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="relative inline-block">
              <img
                ref={imgRef}
                src={imageUrl}
                alt={`${activeView} receipt`}
                className="max-w-full h-auto rounded-lg block"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  setRenderedSize({ width: img.clientWidth, height: img.clientHeight });
                }}
              />
              {showBoundingBoxes && activeView === 'processed' && renderedSize.width > 0 && renderedSize.height > 0 && (
                <BoundingBoxOverlay boxes={result.boxes} scaleX={scale.x} scaleY={scale.y} />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
