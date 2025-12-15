import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HighlightedPre } from '@/components/results/HighlightedPre';
import { cn } from '@/lib/utils';

export interface OCRTextPanelProps {
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
  aiAgentLabel?: string | null;
  aiNotes?: string[];
  highlightText: string | null;
  highlightMarkdown?: string | null;
  highlightJson?: string | null;
  textView: string;
  markdownView: string;
  jsonView: string;
  receiptHtml: string;
}

export const OCRTextPanel = (props: OCRTextPanelProps): JSX.Element => {
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
    aiAgentLabel,
    aiNotes,
    highlightText,
    highlightMarkdown,
    highlightJson,
    textView,
    markdownView,
    jsonView,
    receiptHtml,
  } = props;

  const aiAgentKey = useMemo(() => {
    const raw = (aiAgentLabel || '').trim();
    if (!raw) return null;
    if (raw.toLowerCase().startsWith('transfiriendo a ')) {
      const to = raw.replace(/^transfiriendo a\s+/i, '').replace(/…+$/g, '').trim();
      return to.split('(')[0]?.trim().toLowerCase() || null;
    }
    return raw.split('(')[0]?.trim().toLowerCase() || null;
  }, [aiAgentLabel]);

  const aiActivitySteps = useMemo(() => {
    const key = aiAgentKey;
    const stepsByAgent: Record<string, string[]> = {
      organizer: [
        'Detectando idioma y formato del ticket',
        'Normalizando líneas y espacios del OCR',
        'Agrupando texto por secciones (cabecera, items, totales)',
        'Detectando importes y monedas con heurísticas',
        'Preparando handoff al siguiente agente',
      ],
      auditor: [
        'Comprobando coherencia entre subtotal, impuestos y total',
        'Revisando que cada importe tenga un concepto asociado',
        'Validando fechas y formato de número',
        'Marcando posibles duplicados o líneas ruidosas',
        'Ajustando confianza y notas de revisión',
      ],
      extractor: [
        'Extrayendo campos clave (merchant, fecha, total)',
        'Detectando items y cantidades',
        'Calculando totales derivados para validar resultados',
        'Estructurando el resultado en JSON',
        'Generando Markdown para vista previa',
      ],
    };

    if (!key) return ['Procesando…'];
    if (key.includes('organizer')) return stepsByAgent.organizer;
    if (key.includes('auditor')) return stepsByAgent.auditor;
    if (key.includes('extract')) return stepsByAgent.extractor;

    return [
      'Preparando contexto de análisis',
      'Procesando el OCR y limpiando texto',
      'Extrayendo campos y estructura del ticket',
      'Verificando coherencia de importes',
      'Consolidando resultado final',
    ];
  }, [aiAgentKey]);

  const [aiActivityIndex, setAiActivityIndex] = useState(0);
  const aiActivityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAiProcessing) {
      setAiActivityIndex(0);
      if (aiActivityTimerRef.current !== null) {
        window.clearInterval(aiActivityTimerRef.current);
        aiActivityTimerRef.current = null;
      }
      return;
    }

    setAiActivityIndex(0);
    if (aiActivityTimerRef.current !== null) {
      window.clearInterval(aiActivityTimerRef.current);
    }
    aiActivityTimerRef.current = window.setInterval(() => {
      setAiActivityIndex((prev) => {
        const len = aiActivitySteps.length || 1;
        return (prev + 1) % len;
      });
    }, 1000);

    return () => {
      if (aiActivityTimerRef.current !== null) {
        window.clearInterval(aiActivityTimerRef.current);
        aiActivityTimerRef.current = null;
      }
    };
  }, [isAiProcessing, aiActivitySteps]);

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More formats"
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                    activeFormat !== 'preview' && 'bg-background text-foreground shadow-sm',
                    activeFormat === 'preview' && 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                >
                  ...
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" sideOffset={6}>
                <DropdownMenuRadioGroup
                  value={activeFormat}
                  onValueChange={(v) => setActiveFormat(v as typeof activeFormat)}
                >
                  <DropdownMenuRadioItem value="markdown">Markdown</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="json">JSON</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="receipt">HTML</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="text">Text</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <div className="w-full max-w-xl flex items-start gap-3 rounded-lg border border-border bg-card/90 px-4 py-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary mt-0.5" />
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">Analizando con IA… ({elapsedLabel})</div>
                  {aiAgentLabel ? (
                    <div className="text-xs text-muted-foreground mt-0.5">Agente: {aiAgentLabel}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-0.5">Esto puede tardar unos segundos</div>
                  )}

                  <div className="mt-2 rounded-md border border-border bg-background/50 px-2 py-1">
                    <div className="text-[11px] text-muted-foreground">Actividad</div>
                    <div className="text-xs text-foreground/90 min-h-[18px]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={`${aiAgentKey ?? 'generic'}-${aiActivityIndex}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                        >
                          {aiActivitySteps[aiActivityIndex] ?? 'Procesando…'}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {aiNotes && aiNotes.length > 0 && (
                    <div className="mt-2 max-h-28 overflow-auto rounded-md border border-border bg-background/50 px-2 py-1">
                      <div className="text-[11px] text-muted-foreground">Progreso</div>
                      <div className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                        {aiNotes.slice(-8).map((n, idx) => (
                          <div key={`${idx}-${n.slice(0, 12)}`}>- {n}</div>
                        ))}
                      </div>
                    </div>
                  )}
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
