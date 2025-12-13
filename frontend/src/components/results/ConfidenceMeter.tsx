import { motion } from 'framer-motion';
import { useOCRStore } from '@/store/ocrStore';
import { getConfidenceColor, getConfidenceLabel } from '@/utils/image';

export const ConfidenceMeter = () => {
  const { result } = useOCRStore();

  if (!result) return null;

  const confidence = result.confidence_avg;
  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Confidence Score
      </h3>
      
      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold" style={{ color }}>
            {confidence.toFixed(1)}%
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium border"
            style={{
              borderColor: color,
              backgroundColor: `${color}15`,
              color,
            }}
          >
            {label} Confidence
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        
        {/* Scale */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </motion.div>
  );
};
