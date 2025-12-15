import { motion } from 'framer-motion';
import { Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOCRStore } from '@/store/ocrStore';
import { copyToClipboard } from '@/utils/image';
import { buildSectionedJson, formatBoxesAsSectionedMarkdown, formatBoxesAsSectionedText } from '@/utils/ocrLayout';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { parseReceiptWithAI } from '@/services/api';
import { toast } from 'sonner';

export const OCRText = () => {
  const { result, aiStatus, aiResult, aiError, setAiStatus, setAiResult, setAiError } = useOCRStore();
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'text' | 'preview' | 'markdown' | 'json' | 'receipt'>('text');

  if (!result) return null;

  const hasBoxes = Boolean(result.boxes?.length);
  const effectiveFields = aiResult?.fields || result.fields;
  const textView = aiResult?.text_clean || (hasBoxes ? formatBoxesAsSectionedText(result.boxes) : result.text_raw);
  const markdownView =
    aiResult?.markdown ||
    (hasBoxes ? formatBoxesAsSectionedMarkdown(result.boxes) : ['## Extracted Receipt', '```text', result.text_raw, '```'].join('\n'));
  const jsonView = JSON.stringify(
    aiResult
      ? {
          ai: aiResult,
          ocr: {
            fields: result.fields,
            confidence_avg: result.confidence_avg,
            ...buildSectionedJson(result.boxes ?? []),
            text_raw: result.text_raw,
            boxes_count: result.boxes?.length ?? 0,
          },
        }
      : {
          fields: result.fields,
          confidence_avg: result.confidence_avg,
          ...buildSectionedJson(result.boxes ?? []),
          text_raw: result.text_raw,
          boxes_count: result.boxes?.length ?? 0,
        },
    null,
    2,
  );

  const receiptHtml = useMemo(() => {
    const escapeHtml = (s: string): string =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const applyExtractedFields = (boxes: typeof result.boxes): typeof result.boxes => {
      if (!boxes.length) return boxes;
      const updated = boxes.slice();

      if (effectiveFields?.merchant) {
        updated[0] = { ...updated[0], text: effectiveFields.merchant };
      }

      if (effectiveFields?.date) {
        const dateRe = /\b(\d{2}[./-]\d{2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b/;
        const idx = updated.slice(0, 20).findIndex((b) => dateRe.test(b.text));
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], text: updated[idx].text.replace(dateRe, effectiveFields.date) };
        }
      }

      if (typeof effectiveFields?.total === 'number') {
        const totalStr = effectiveFields.total.toFixed(2);
        const moneyRe = /(\d+[\.,]\d{2})/;
        const keywords = ['samtals', 'heild', 'total', 'alls'];

        let best = -1;
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          const txt = updated[i].text.toLowerCase();
          if (keywords.some((k) => txt.includes(k)) && moneyRe.test(updated[i].text)) {
            best = i;
            break;
          }
        }
        if (best === -1) {
          for (let i = updated.length - 1; i >= 0; i -= 1) {
            if (moneyRe.test(updated[i].text)) {
              best = i;
              break;
            }
          }
        }

        if (best >= 0) {
          updated[best] = { ...updated[best], text: updated[best].text.replace(moneyRe, totalStr) };
        }
      }

      return updated;
    };

    const patched = applyExtractedFields(result.boxes ?? []);

    const fallbackText = escapeHtml(textView);
    if (!hasBoxes) {
      return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .wrap { padding: 12px; }
    .ticket { width: 100%; background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); padding: 14px; }
    pre { margin: 0; white-space: pre-wrap; line-height: 1.25; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="ticket"><pre>${fallbackText}</pre></div>
  </div>
</body>
</html>`;
    }

    const doc = buildSectionedJson(patched).document;

    const isNumericLike = (s: string): boolean => /(\d+[\.,]\d{2}|\b\d+\b)/.test(s.trim());

    const headerMerchant = escapeHtml(effectiveFields?.merchant || patched.at(0)?.text || '');
    const headerDate = escapeHtml(effectiveFields?.date || '');
    const headerTotal = typeof effectiveFields?.total === 'number' ? escapeHtml(effectiveFields.total.toFixed(2)) : '';

    const headerLines: string[] = [];
    if (headerMerchant) headerLines.push(`<div class="h1">${headerMerchant}</div>`);
    if (headerDate || headerTotal) {
      headerLines.push(
        `<div class="meta">${headerDate ? `<span>${headerDate}</span>` : '<span></span>'}${headerTotal ? `<span class="r">Total: ${headerTotal}</span>` : '<span></span>'}</div>`,
      );
    }

    const renderTextSection = (lines: string[], className: string): string => {
      const safe = lines.map((ln) => escapeHtml(ln)).filter((ln) => ln.trim().length > 0);
      if (!safe.length) return '';
      return `<div class="${className}">${safe.map((ln) => `<div class="ln">${ln}</div>`).join('')}</div>`;
    };

    const renderTableSection = (table: any): string => {
      const rows = Array.isArray(table?.rows) ? table.rows : [];
      const columnsCount = Array.isArray(table?.columns) ? table.columns.length : 0;
      if (!rows.length || columnsCount <= 0) return '';

      const colTemplate = `repeat(${columnsCount}, minmax(0, 1fr))`;
      const body = rows
        .map((r: any) => {
          const cells = Array.isArray(r?.cells) ? r.cells : [];
          const normalized = Array.from({ length: columnsCount }, (_, i) => String(cells[i] ?? ''));
          const tds = normalized
            .map((cell, i) => {
              const safe = escapeHtml(cell);
              const right = i === columnsCount - 1 || isNumericLike(cell);
              return `<div class="td ${right ? 'right' : 'left'}">${safe}</div>`;
            })
            .join('');
          return `<div class="tr" style="grid-template-columns:${colTemplate}">${tds}</div>`;
        })
        .join('');

      return `<div class="tbl">${body}</div>`;
    };

    const sectionsHtml = (doc.sections || [])
      .map((sec: any, idx: number) => {
        if (sec?.kind === 'text') {
          const cls = idx === 0 ? 'sec text muted' : 'sec text';
          return renderTextSection(sec.lines || [], cls);
        }
        if (sec?.kind === 'table') {
          return `<div class="sec">${renderTableSection(sec.table)}</div>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('<div class="sep"></div>');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 12px; background: #fff; }
    .frame { display: flex; justify-content: center; }
    .ticket {
      width: 100%;
      max-width: 520px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #111;
    }
    .h1 { text-align: center; font-weight: 700; font-size: 22px; line-height: 1.2; margin-bottom: 6px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #333; margin-bottom: 10px; }
    .meta .r { text-align: right; }
    .sep { height: 1px; background: rgba(0,0,0,0.10); margin: 10px 0; }
    .sec { font-size: 13px; line-height: 1.35; }
    .sec.text .ln { white-space: pre-wrap; }
    .sec.text.muted { color: #444; }
    .tbl { display: grid; gap: 6px; }
    .tr { display: grid; gap: 10px; align-items: baseline; }
    .td { white-space: pre-wrap; word-break: break-word; }
    .td.right { text-align: right; }
    .td.left { text-align: left; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="ticket">
      ${headerLines.join('')}
      ${headerLines.length ? '<div class="sep"></div>' : ''}
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`;
  }, [effectiveFields, hasBoxes, result.boxes, textView]);

  const isAiProcessing = aiStatus === 'processing' || aiStatus === 'uploading';

  const handleImproveWithAI = async () => {
    if (!result) return;
    if (isAiProcessing) return;
    setAiError(null);
    setAiStatus('processing');
    try {
      const parsed = await parseReceiptWithAI({
        text_raw: result.text_raw,
        fields: result.fields,
        boxes: result.boxes,
      });
      setAiResult(parsed);
      toast.success('Mejorado con IA');
    } catch (e: any) {
      const isTimeout =
        e?.code === 'ECONNABORTED' ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('timeout'));

      const msg = isTimeout
        ? 'La IA está tardando más de lo esperado. Espera unos segundos y vuelve a intentar.'
        : e?.response?.data?.detail || e?.message || 'Failed to improve with AI';

      setAiError(String(msg));
      toast.error(String(msg));
    }
  };

  const textToCopy =
    activeFormat === 'receipt'
      ? receiptHtml
      : activeFormat === 'markdown' || activeFormat === 'preview'
        ? markdownView
        : activeFormat === 'json'
          ? jsonView
          : textView;

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
      className="h-full flex flex-col gap-3 min-h-0"
    >
      <Tabs
        value={activeFormat}
        onValueChange={(v) => setActiveFormat(v as typeof activeFormat)}
        className="h-full flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between">
          <TabsList className="h-8 p-1">
            <TabsTrigger value="preview" className="px-2 py-1 text-xs">Preview</TabsTrigger>
            <TabsTrigger value="markdown" className="px-2 py-1 text-xs">Markdown</TabsTrigger>
            <TabsTrigger value="json" className="px-2 py-1 text-xs">JSON</TabsTrigger>
            <TabsTrigger value="receipt" className="px-2 py-1 text-xs">HTML</TabsTrigger>
            <TabsTrigger value="text" className="px-2 py-1 text-xs">Text</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={aiResult ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleImproveWithAI}
              disabled={isAiProcessing}
              className="gap-2"
            >
              {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isAiProcessing ? 'Analizando con IA…' : 'Mejorar con IA'}</span>
            </Button>

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
                  <div className="text-sm font-medium text-foreground">Analizando con IA…</div>
                  <div className="text-xs text-muted-foreground">Esto puede tardar unos segundos</div>
                </div>
              </div>
            </div>
          )}

          <TabsContent value="text" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {textView}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="markdown" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {markdownView}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <MarkdownPreview markdown={markdownView} />
            </div>
          </TabsContent>

          <TabsContent value="json" className="m-0 h-full">
            <div className="rounded-lg bg-secondary/50 border border-border p-4 h-full overflow-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {jsonView}
              </pre>
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
