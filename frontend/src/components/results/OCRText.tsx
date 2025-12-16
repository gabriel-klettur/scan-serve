import { useEffect, useMemo, useRef, useState } from 'react';
import { useOCRStore } from '@/store/ocrStore';
import { copyToClipboard } from '@/utils/image';
import { buildSectionedJson, formatBoxesAsSectionedMarkdown, formatBoxesAsSectionedText } from '@/utils/ocrLayout';
import { parseReceiptMarkdown } from '@/utils/receipt/parseReceiptMarkdown';
import { renderReceiptHtmlFromDocument } from '@/utils/receipt/renderReceiptHtml';
import { AiParseStreamEvent, parseReceiptWithAI, parseReceiptWithAIStream } from '@/services/api';
import { toast } from 'sonner';
import { OCRTextPanel } from '@/components/results/OCRTextPanel';

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findRelaxedMatch = (haystack: string, needle: string): string | null => {
  const h = haystack || '';
  const n = (needle || '').trim();
  if (!n || n.length < 2) return null;

  const hLower = h.toLowerCase();
  const nLower = n.toLowerCase();
  const directIdx = hLower.indexOf(nLower);
  if (directIdx >= 0) {
    return h.slice(directIdx, directIdx + n.length);
  }

  const pattern = n
    .split('')
    .map((ch) => {
      // Markdown tables insert pipes between cells; treat them similarly to whitespace.
      if (/\s/.test(ch)) return '(?:\\s+|\\s*\\|\\s*)+';
      if (ch === '.' || ch === ',') return '[\\.,]';
      return escapeRegExp(ch);
    })
    .join('');

  try {
    const re = new RegExp(pattern, 'i');
    const m = re.exec(h);
    return m?.[0] ?? null;
  } catch {
    return null;
  }
};

export const OCRText = () => {
  const {
    result,
    aiStatus,
    aiResult,
    aiError,
    setAiStatus,
    setAiResult,
    setAiError,
    aiStageResults,
    aiSelectedStage,
    mergeAiStageResult,
    resetAiStages,
    setAiSelectedStage,
    pulseAiStage,
    setAiActiveStageKey,
    hoveredBoxIndex,
    selectedBoxIndex,
  } = useOCRStore();
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'text' | 'preview' | 'markdown' | 'json' | 'receipt'>('preview');
  const [aiElapsedMs, setAiElapsedMs] = useState(0);
  const [aiLastDurationMs, setAiLastDurationMs] = useState<number | null>(null);
  const [aiAgentLabel, setAiAgentLabel] = useState<string | null>(null);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const aiStartMsRef = useRef<number | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  if (!result) return null;

  const hasBoxes = Boolean(result.boxes?.length);
  const selectedStageResult = aiSelectedStage ? aiStageResults[aiSelectedStage] : null;
  const effectiveAi = selectedStageResult || aiResult;
  const effectiveFields = effectiveAi?.fields || result.fields;
  const textView = effectiveAi?.text_clean || (hasBoxes ? formatBoxesAsSectionedText(result.boxes) : result.text_raw);
  const markdownView =
    effectiveAi?.markdown ||
    (hasBoxes ? formatBoxesAsSectionedMarkdown(result.boxes) : ['## Extracted Receipt', '```text', result.text_raw, '```'].join('\n'));
  const parsedDocument = useMemo(() => parseReceiptMarkdown(markdownView), [markdownView]);

  const jsonView = useMemo(() => {
    const base = {
      fields: effectiveFields,
      confidence_avg: result.confidence_avg,
      text_raw: result.text_raw,
      boxes_count: result.boxes?.length ?? 0,
      document: parsedDocument,
    };

    if (aiResult) {
      return JSON.stringify(
        {
          ai: aiResult,
          ai_metrics: {
            elapsed_ms: aiLastDurationMs,
            elapsed_s: aiLastDurationMs === null ? null : Number((aiLastDurationMs / 1000).toFixed(2)),
          },
          ocr: {
            fields: result.fields,
            confidence_avg: result.confidence_avg,
            ...buildSectionedJson(result.boxes ?? []),
            text_raw: result.text_raw,
            boxes_count: result.boxes?.length ?? 0,
          },
          derived: base,
        },
        null,
        2,
      );
    }

    return JSON.stringify(base, null, 2);
  }, [aiLastDurationMs, aiResult, effectiveFields, parsedDocument, result.boxes, result.confidence_avg, result.fields, result.text_raw]);

  const isAiProcessing = aiStatus === 'processing' || aiStatus === 'uploading';

  useEffect(() => {
    if (!result) return;
    setActiveFormat('preview');
  }, [result]);

  useEffect(() => {
    if (isAiProcessing) return;
    aiStartMsRef.current = null;
    setAiElapsedMs(0);
    if (aiTimerRef.current !== null) {
      window.clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, [isAiProcessing]);

  const handleImproveWithAI = async () => {
    if (!result) return;
    if (isAiProcessing) return;
    setActiveFormat('preview');
    setAiError(null);
    setAiResult(null);

    aiStartMsRef.current = Date.now();
    setAiElapsedMs(0);
    setAiLastDurationMs(null);
    if (aiTimerRef.current !== null) {
      window.clearInterval(aiTimerRef.current);
    }
    aiTimerRef.current = window.setInterval(() => {
      if (aiStartMsRef.current === null) return;
      setAiElapsedMs(Date.now() - aiStartMsRef.current);
    }, 250);

    setAiStatus('processing');
    setAiAgentLabel(null);
    setAiNotes([]);
    resetAiStages();
    setAiActiveStageKey(null);
    try {
      const onEvent = (evt: AiParseStreamEvent) => {
        if (evt.type === 'stage_start') {
          setAiAgentLabel(evt.agent || evt.stage);
          const key = (evt.stage || evt.agent || '').trim().toLowerCase();
          if (key) setAiActiveStageKey(key);
        }
        if (evt.type === 'stage_result') {
          const stage = (evt.stage || '').trim();
          if (!stage) return;
          mergeAiStageResult(stage, evt.data);
          pulseAiStage(stage);
          const st = useOCRStore.getState();
          if (st.aiAutoFollowStage) {
            setAiSelectedStage(stage);
          } else if (!st.aiSelectedStage) {
            setAiSelectedStage(stage);
          }
        }
        if (evt.type === 'handoff') {
          const to = evt.to_agent || evt.to_stage;
          const from = evt.from_agent || evt.from_stage;
          setAiAgentLabel(`Transfiriendo a ${to}…`);
          const key = (to || '').trim().toLowerCase();
          if (key) setAiActiveStageKey(key);
          setAiNotes((prev) => {
            const next = prev.length >= 60 ? prev.slice(prev.length - 59) : prev;
            return [...next, `${from} → ${to}`];
          });
        }
        if (evt.type === 'note') {
          const text = (evt.text || '').trim();
          if (!text) return;
          setAiNotes((prev) => {
            const next = prev.length >= 60 ? prev.slice(prev.length - 59) : prev;
            return [...next, text];
          });
        }
      };

      let parsed;
      try {
        parsed = await parseReceiptWithAIStream(
          {
            receiptId: result.receiptId,
            text_raw: result.text_raw,
            fields: result.fields,
            boxes: result.boxes,
          },
          onEvent,
        );
      } catch {
        parsed = await parseReceiptWithAI({
          receiptId: result.receiptId,
          text_raw: result.text_raw,
          fields: result.fields,
          boxes: result.boxes,
        });
      }
      setAiResult(parsed);

      // Robustness: if streaming fails mid-run and we fall back to non-stream,
      // we might miss the final stage_result (stylist). Since the pipeline's
      // last stage is stylist, reuse the final result as a stylist snapshot so
      // the user can still inspect/select it.
      const stAfter = useOCRStore.getState();
      if (parsed && !stAfter.aiStageResults?.stylist) {
        mergeAiStageResult('stylist', parsed);
      }

      toast.success('Mejorado con IA');
    } catch (e: any) {
      setAiResult(null);
      const isAbort = e?.name === 'AbortError';
      const isTimeout =
        isAbort ||
        e?.code === 'ECONNABORTED' ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('timeout'));

      const msg = isTimeout
        ? 'La IA está tardando más de lo esperado. Espera unos segundos y vuelve a intentar.'
        : e?.response?.data?.detail || e?.message || 'Failed to improve with AI';

      setAiError(String(msg));
      toast.error(String(msg));
    } finally {
      if (aiStartMsRef.current !== null) {
        setAiLastDurationMs(Date.now() - aiStartMsRef.current);
      }
      if (aiTimerRef.current !== null) {
        window.clearInterval(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      setAiActiveStageKey(null);
    }
  };

  const elapsedSeconds = Math.floor(aiElapsedMs / 1000);
  const elapsedLabel = `${elapsedSeconds}s`;

  const activeBoxText = useMemo(() => {
    const idx = selectedBoxIndex !== null ? selectedBoxIndex : hoveredBoxIndex;
    if (idx === null) return null;
    return result.boxes?.[idx]?.text ?? null;
  }, [hoveredBoxIndex, result.boxes, selectedBoxIndex]);

  const highlightTextTab = useMemo(() => {
    const raw = activeBoxText;
    if (!raw) return null;
    if (!aiResult) return raw;
    return findRelaxedMatch(textView, raw) || raw;
  }, [activeBoxText, aiResult, textView]);

  const highlightMarkdownTab = useMemo(() => {
    const raw = activeBoxText;
    if (!raw) return null;
    if (!aiResult) return raw;
    return findRelaxedMatch(markdownView, raw) || raw;
  }, [activeBoxText, aiResult, markdownView]);

  const highlightJsonTab = useMemo(() => {
    const raw = activeBoxText;
    if (!raw) return null;
    return findRelaxedMatch(jsonView, raw) || raw;
  }, [activeBoxText, jsonView]);

  const highlightHtml = highlightMarkdownTab || highlightTextTab || activeBoxText;

  const receiptHtml = useMemo(
    () =>
      renderReceiptHtmlFromDocument({
        document: parsedDocument,
        fields: effectiveFields,
        fallbackText: textView,
        highlight: highlightHtml,
      }),
    [effectiveFields, highlightHtml, parsedDocument, textView],
  );

  const lastDurationLabel = useMemo(() => {
    if (aiLastDurationMs === null) return null;
    const totalSeconds = Math.floor(aiLastDurationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${totalSeconds}s`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [aiLastDurationMs]);

  useEffect(() => {
    if (isAiProcessing) return;
    if (!aiResult) return;
    setAiSelectedStage(null);
  }, [aiResult, isAiProcessing]);

  const textToCopy =
    activeFormat === 'receipt'
      ? receiptHtml
      : activeFormat === 'markdown' || activeFormat === 'preview'
        ? markdownView
        : activeFormat === 'json'
          ? jsonView
          : textView;

  const handleEmail = () => {
    const subjectParts = [effectiveFields?.merchant, effectiveFields?.date].filter(Boolean);
    const subject = subjectParts.length ? `Scan Serve - ${subjectParts.join(' - ')}` : 'Scan Serve - OCR Result';
    const body = textToCopy;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

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
    <OCRTextPanel
      activeFormat={activeFormat}
      setActiveFormat={setActiveFormat}
      isAiProcessing={isAiProcessing}
      onImproveWithAI={handleImproveWithAI}
      onCopy={handleCopy}
      onEmail={handleEmail}
      copied={copied}
      aiError={aiError}
      aiHasResult={Boolean(aiResult)}
      lastDurationLabel={lastDurationLabel}
      elapsedLabel={elapsedLabel}
      aiAgentLabel={aiAgentLabel}
      aiNotes={aiNotes}
      highlightText={highlightTextTab}
      highlightMarkdown={highlightMarkdownTab}
      highlightJson={highlightJsonTab}
      textView={textView}
      markdownView={markdownView}
      jsonView={jsonView}
      receiptHtml={receiptHtml}
    />
  );
};
