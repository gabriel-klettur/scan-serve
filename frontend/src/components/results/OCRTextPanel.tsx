import { motion } from 'framer-motion';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HighlightedPre } from '@/components/results/HighlightedPre';

export const OCRTextPanel = (props: {
  activeFormat: 'text' | 'preview' | 'markdown' | 'json' | 'receipt';
  setActiveFormat: (v: 'text' | 'preview' | 'markdown' | 'json' | 'receipt') => void;
  isAiProcessing: boolean;
  onImproveWithAI: () => void;
  onCopy: () => void;
  copied: boolean;
  aiError: string | null;
  aiHasResult: boolean;
  lastDurationLabel: string | null;
  elapsedLabel: string;
  highlightText: string | null;
  highlightMarkdown?: string | null;
  highlightJson?: string | null;
  textView: string;
  markdownView: string;
  jsonView: string;
  receiptHtml: string;
}): JSX.Element => {
  const {
    activeFormat,
    setActiveFormat,
    isAiProcessing,
    onImproveWithAI,
    onCopy,
    copied,
    aiError,
    aiHasResult,
    lastDurationLabel,
    elapsedLabel,
    highlightText,
    highlightMarkdown,
    highlightJson,
    textView,
    markdownView,
    jsonView,
    receiptHtml,
  } = props;

  const mdHighlight = highlightMarkdown ?? highlightText;
  const jsHighlight = highlightJson ?? highlightText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col gap-3 min-h-0"
    >
      <Tabs
        value={activeFormat}
        onValueChange={(v) => setActiveFormat(v as typeof activeFormat)}
        className="h-full flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between">
          <TabsList className="h-8 p-1">
            <TabsTrigger value="preview" className="px-2 py-1 text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="markdown" className="px-2 py-1 text-xs">
              Markdown
            </TabsTrigger>
            <TabsTrigger value="json" className="px-2 py-1 text-xs">
              JSON
            </TabsTrigger>
            <TabsTrigger value="receipt" className="px-2 py-1 text-xs">
              HTML
            </TabsTrigger>
            <TabsTrigger value="text" className="px-2 py-1 text-xs">
              Text
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={aiHasResult ? 'secondary' : 'outline'}
              size="sm"
              onClick={onImproveWithAI}
              disabled={isAiProcessing}
              className="gap-2"
            >
              {isAiProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isAiProcessing ? 'Analizando con IA…' : 'Mejorar con IA'}</span>
            </Button>

            {lastDurationLabel && !isAiProcessing && (
              <div className="text-xs text-muted-foreground">Último: {lastDurationLabel}</div>
            )}

            <Button variant="ghost" size="sm" onClick={onCopy} className="gap-2">
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
        </div>

        {aiError && (
          <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-2 py-1">
            {aiError}
          </div>
        )}

        <div className="relative flex-1 min-h-0" aria-busy={isAiProcessing}>
          {isAiProcessing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/90 px-4 py-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="leading-tight">
                  <div className="text-sm font-medium text-foreground">Analizando con IA… ({elapsedLabel})</div>
                  <div className="text-xs text-muted-foreground">Esto puede tardar unos segundos</div>
                </div>
              </div>
            </div>
          )}

          <TabsContent value="text" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <HighlightedPre text={textView} highlight={highlightText} />
            </div>
          </TabsContent>

          <TabsContent value="markdown" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <HighlightedPre text={markdownView} highlight={mdHighlight} />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <MarkdownPreview markdown={markdownView} highlight={mdHighlight} />
            </div>
          </TabsContent>

          <TabsContent value="json" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <HighlightedPre text={jsonView} highlight={jsHighlight} />
            </div>
          </TabsContent>

          <TabsContent value="receipt" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-2 h-full overflow-hidden">
              <iframe
                title="Receipt Preview"
                className="w-full h-full rounded-md bg-white"
                sandbox=""
                srcDoc={receiptHtml}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
};
