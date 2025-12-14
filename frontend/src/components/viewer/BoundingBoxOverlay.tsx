import { motion } from 'framer-motion';
import { BoundingBox } from '@/types/ocr';
import { useOCRStore } from '@/store/ocrStore';
import { getConfidenceColor } from '@/utils/image';
import { cn } from '@/lib/utils';

interface BoundingBoxOverlayProps {
  boxes: BoundingBox[];
  scaleX: number;
  scaleY: number;
}

const getRectFromBbox = (bbox: number[][]) => {
  const xs = bbox.map((p) => p[0]);
  const ys = bbox.map((p) => p[1]);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  const y1 = Math.min(...ys);
  const y2 = Math.max(...ys);
  return { x1, y1, x2, y2 };
};

export const BoundingBoxOverlay = ({ boxes, scaleX, scaleY }: BoundingBoxOverlayProps) => {
  const { selectedBox, setSelectedBox } = useOCRStore();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((box, index) => {
        const { x1, y1, x2, y2 } = getRectFromBbox(box.bbox);
        const left = x1 * scaleX;
        const top = y1 * scaleY;
        const width = (x2 - x1) * scaleX;
        const height = (y2 - y1) * scaleY;
        const isSelected = selectedBox?.text === box.text;
        const color = getConfidenceColor(box.confidence);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "absolute pointer-events-auto cursor-pointer transition-all duration-200",
              "border-2 rounded-sm",
              isSelected && "ring-2 ring-offset-2 ring-offset-background"
            )}
            style={{
              left,
              top,
              width,
              height,
              borderColor: color,
              backgroundColor: isSelected ? `${color}20` : 'transparent',
              // @ts-expect-error ring color handled via CSS
              '--tw-ring-color': color,
            }}
            onClick={() => setSelectedBox(isSelected ? null : box)}
            onMouseEnter={() => !isSelected && setSelectedBox(box)}
            onMouseLeave={() => !isSelected && setSelectedBox(null)}
          >
            {/* Tooltip on hover */}
            {(isSelected || selectedBox?.text === box.text) && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded bg-background/95 border border-border shadow-lg z-10 whitespace-nowrap"
              >
                <p className="text-xs font-medium text-foreground truncate max-w-[200px]">
                  {box.text}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence: <span style={{ color }}>{box.confidence.toFixed(1)}%</span>
                </p>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
