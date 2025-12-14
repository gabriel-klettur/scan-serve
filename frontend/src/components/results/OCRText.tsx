import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useOCRStore } from '@/store/ocrStore';
import { copyToClipboard } from '@/utils/image';
import { buildSectionedJson, formatBoxesAsSectionedMarkdown, formatBoxesAsSectionedText } from '@/utils/ocrLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export const OCRText = () => {
  const { result } = useOCRStore();
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'text' | 'markdown' | 'json'>('text');

  if (!result) return null;

  const hasBoxes = Boolean(result.boxes?.length);
  const textView = hasBoxes ? formatBoxesAsSectionedText(result.boxes) : result.text_raw;
  const markdownView = hasBoxes ? formatBoxesAsSectionedMarkdown(result.boxes) : ['## Extracted Receipt', '```text', result.text_raw, '```'].join('\n');
  const jsonView = JSON.stringify(
    {
      fields: result.fields,
      confidence_avg: result.confidence_avg,
      ...buildSectionedJson(result.boxes ?? []),
      text_raw: result.text_raw,
      boxes_count: result.boxes?.length ?? 0,
    },
    null,
    2,
  );

  const textToCopy = activeFormat === 'markdown' ? markdownView : activeFormat === 'json' ? jsonView : textView;

  const handleCopy = async () => {
    const success = await copyToClipboard(textToCopy);
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
      <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as typeof activeFormat)}>
        <div className="flex items-center justify-between">
          <TabsList className="h-8 p-1">
            <TabsTrigger value="text" className="px-2 py-1 text-xs">Text</TabsTrigger>
            <TabsTrigger value="markdown" className="px-2 py-1 text-xs">Markdown</TabsTrigger>
            <TabsTrigger value="json" className="px-2 py-1 text-xs">JSON</TabsTrigger>
          </TabsList>

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

        <TabsContent value="text" className="m-0">
          <div className="rounded-lg bg-secondary/50 border border-border p-4 max-h-[300px] overflow-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {textView}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="markdown" className="m-0">
          <div className="rounded-lg bg-secondary/50 border border-border p-4 max-h-[300px] overflow-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {markdownView}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="json" className="m-0">
          <div className="rounded-lg bg-secondary/50 border border-border p-4 max-h-[300px] overflow-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {jsonView}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
