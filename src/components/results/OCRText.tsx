import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useOCRStore } from '@/store/ocrStore';
import { copyToClipboard } from '@/utils/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const OCRText = () => {
  const { result } = useOCRStore();
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(result.text_raw);
    if (success) {
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy text');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Extracted Text
        </h3>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="w-4 h-4 text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      
      <div className="rounded-lg bg-secondary/50 border border-border p-4 max-h-[300px] overflow-auto">
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {result.text_raw}
        </pre>
      </div>
    </motion.div>
  );
};
