import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Loader2, Mail, Sparkles } from 'lucide-react';
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

type FakeScriptByAgent = Record<string, string[]>;

const randomIntInclusive = (min: number, max: number): number => {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
};

const normalizeKey = (s: string | null | undefined): string => (s || '').trim().toLowerCase();

const buildFakeScript = (agentKey: string, count: number): string[] => {
  const key = normalizeKey(agentKey);

  const generic = [
    'Preparando contexto y normalizando entrada',
    'Validando consistencia interna de los datos',
    'Aplicando heurísticas de limpieza y estructura',
    'Recalculando métricas de confianza',
    'Consolidando salida y verificando invariantes',
    'Optimizando formato para lectura humana',
    'Preparando siguiente paso del pipeline',
  ];

  const organizer = [
    'Detectando idioma, moneda y formato regional',
    'Normalizando líneas, espacios y cortes del OCR',
    'Agrupando contenido por secciones (cabecera/items/totales)',
    'Identificando importes candidatos y separadores',
    'Reordenando fragmentos con alta probabilidad de continuidad',
    'Generando estructura inicial del documento',
  ];

  const auditor = [
    'Verificando coherencia subtotal/impuestos/total',
    'Comprobando que cada importe tenga contexto',
    'Detectando duplicados y ruido del OCR',
    'Normalizando separadores de miles y decimales',
    'Marcando inconsistencias para corrección',
    'Ajustando puntuación de confianza por regla',
  ];

  const stylist = [
    'Reformateando Markdown para lectura clara',
    'Generando títulos y jerarquía de secciones',
    'Convirtiendo items a listas/tablas cuando aplica',
    'Aplicando consistencia tipográfica y espaciado',
    'Produciendo resumen final de totales',
    'Revisando que el resultado sea estable y reproducible',
  ];

  const base =
    key.includes('organizer')
      ? organizer
      : key.includes('auditor')
        ? auditor
        : key.includes('stylist')
          ? stylist
          : generic;

  const out: string[] = [];
  let i = 0;
  while (out.length < count) {
    const pick = base[i % base.length];
    out.push(pick);
    i += 1;
  }
  return out;
};

export interface OCRTextPanelProps {
  activeFormat: 'text' | 'preview' | 'markdown' | 'json' | 'receipt';
  setActiveFormat: (v: 'text' | 'preview' | 'markdown' | 'json' | 'receipt') => void;
  isAiProcessing: boolean;
  onImproveWithAI: () => void;
  onCopy: () => void;
  onEmail: () => void;
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
    onEmail,
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

  const [fakeScripts, setFakeScripts] = useState<FakeScriptByAgent>({});
  const activeAgentForScripts = normalizeKey(aiAgentKey);

  useEffect(() => {
    if (!isAiProcessing) {
      setFakeScripts({});
      return;
    }
    if (!activeAgentForScripts) return;
    setFakeScripts((prev) => {
      if (prev[activeAgentForScripts]?.length) return prev;
      const nextCount = randomIntInclusive(5, 20);
      return {
        ...prev,
        [activeAgentForScripts]: buildFakeScript(activeAgentForScripts, nextCount),
      };
    });
  }, [activeAgentForScripts, isAiProcessing]);

  const aiProgressSteps = useMemo(() => {
    const notes = aiNotes || [];
    if (notes.length) return notes.slice(-12);
    if (!activeAgentForScripts) return [];
    return fakeScripts[activeAgentForScripts] || [];
  }, [activeAgentForScripts, aiNotes, fakeScripts]);

  const [aiProgressIndex, setAiProgressIndex] = useState(0);
  const aiProgressTimerRef = useRef<number | null>(null);
  const aiProgressStepsRef = useRef<string[]>([]);

  useEffect(() => {
    aiProgressStepsRef.current = aiProgressSteps;
  }, [aiProgressSteps]);

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

  useEffect(() => {
    if (!isAiProcessing) {
      setAiProgressIndex(0);
      if (aiProgressTimerRef.current !== null) {
        window.clearInterval(aiProgressTimerRef.current);
        aiProgressTimerRef.current = null;
      }
      return;
    }

    // Reset to latest message when new progress arrives.
    setAiProgressIndex(0);
    if (aiProgressTimerRef.current !== null) {
      window.clearInterval(aiProgressTimerRef.current);
    }

    aiProgressTimerRef.current = window.setInterval(() => {
      setAiProgressIndex((prev) => {
        const steps = aiProgressStepsRef.current;
        const len = steps.length || 1;
        const next = (prev + 1) % len;
        if (next === 0 && len > 0 && !((aiNotes || []).length)) {
          const key = activeAgentForScripts;
          if (key) {
            const nextCount = randomIntInclusive(5, 20);
            setFakeScripts((prevScripts) => ({
              ...prevScripts,
              [key]: buildFakeScript(key, nextCount),
            }));
          }
        }
        return next;
      });
    }, 1200);

    return () => {
      if (aiProgressTimerRef.current !== null) {
        window.clearInterval(aiProgressTimerRef.current);
        aiProgressTimerRef.current = null;
      }
    };
  }, [isAiProcessing, aiProgressSteps.length]);

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
        <div className="flex items-center gap-2">
          <TabsList className="h-8 p-1 shrink-0">
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

          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            {isAiProcessing ? (
              <motion.div
                className={cn(
                  'rounded-md border border-amber-200/30 ring-1 ring-amber-200/30',
                  'bg-gradient-to-r from-amber-50/5 via-white/0 to-amber-50/5',
                )}
                animate={{
                  boxShadow: [
                    '0 0 18px rgba(255,255,255,0.16), 0 0 8px rgba(255,255,255,0.08)',
                    '0 0 18px rgba(253,230,138,0.20), 0 0 8px rgba(255,255,255,0.06)',
                    '0 0 18px rgba(255,255,255,0.16), 0 0 8px rgba(255,255,255,0.08)',
                  ],
                }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              >
                <Button
                  variant={aiHasResult ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={onImproveWithAI}
                  disabled
                  className="gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando con IA…</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                className={cn(
                  'rounded-md',
                  !aiHasResult && 'border border-primary/25 ring-1 ring-primary/25',
                  !aiHasResult && 'bg-gradient-to-r from-primary/10 via-primary/0 to-primary/10',
                )}
                animate={
                  !aiHasResult
                    ? {
                        boxShadow: [
                          '0 0 18px rgba(255,255,255,0.12), 0 0 10px rgba(59,130,246,0.10)',
                          '0 0 22px rgba(59,130,246,0.22), 0 0 12px rgba(255,255,255,0.08)',
                          '0 0 18px rgba(255,255,255,0.12), 0 0 10px rgba(59,130,246,0.10)',
                        ],
                      }
                    : undefined
                }
                transition={
                  !aiHasResult
                    ? {
                        duration: 2.6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                      }
                    : undefined
                }
              >
                <Button
                  variant={aiHasResult ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={onImproveWithAI}
                  disabled={isAiProcessing}
                  className={cn('gap-2', !aiHasResult && 'border-primary/30 bg-primary/5 hover:bg-primary/10')}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mejorar con IA</span>
                </Button>
              </motion.div>
            )}

            {lastDurationLabel && !isAiProcessing && (
              <div className="text-xs text-muted-foreground">Último: {lastDurationLabel}</div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

            <Button variant="ghost" size="sm" onClick={onEmail} className="gap-2">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </Button>
          </div>
        </div>

        {aiError && (
          <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-2 py-1">
            {aiError}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col gap-3" aria-busy={isAiProcessing}>
          <div className="flex-1 min-h-0">
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

          {isAiProcessing && (
            <motion.div
              className={cn(
                'w-full flex items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm',
                'border-amber-200/30 ring-1 ring-amber-200/30',
                'bg-gradient-to-r from-amber-50/5 via-white/0 to-amber-50/5',
              )}
              animate={{
                boxShadow: [
                  '0 0 22px rgba(255,255,255,0.18), 0 0 10px rgba(255,255,255,0.10)',
                  '0 0 22px rgba(253,230,138,0.22), 0 0 10px rgba(255,255,255,0.08)',
                  '0 0 22px rgba(255,255,255,0.18), 0 0 10px rgba(255,255,255,0.10)',
                ],
              }}
              transition={{
                duration: 2.4,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
            >
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
                    <div className="text-[11px] text-muted-foreground">Bitácora</div>
                    <div className="text-xs text-foreground/90 min-h-[18px]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={`progress-${aiProgressSteps.length}-${aiProgressIndex}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="whitespace-pre-wrap break-words"
                        >
                          {aiProgressSteps[aiProgressIndex] ? `- ${aiProgressSteps[aiProgressIndex]}` : '—'}
                        </motion.div>
                      </AnimatePresence>

                      {aiProgressSteps.length > 1 && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {Math.min(aiProgressIndex + 1, aiProgressSteps.length)} / {aiProgressSteps.length}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </Tabs>
    </motion.div>
  );
};
