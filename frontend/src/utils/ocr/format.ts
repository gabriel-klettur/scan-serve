import type { BoundingBox } from '@/types/ocr';

import type { LayoutConfig } from './config';
import { DEFAULT_LAYOUT_CONFIG } from './config';
import { toFixedWidthTable } from './cells';
import { median } from './geometry';
import { receiptTableToMarkdown } from './markdown';
import { buildReceiptDocument, buildReceiptSections } from './sections';
import { toWords } from './words';

export const formatBoxesAsTextLines = (boxes: BoundingBox[], cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG): string => {
  const words = toWords(boxes);
  if (words.length === 0) return '';

  const rows = buildReceiptSections(words, cfg)
    .flatMap((s) => (s.kind === 'text' ? s.lines : s.table.rows.map((r) => r.cells.join(' '))));

  return rows.join('\n');
};

export const formatBoxesAsSectionedText = (
  boxes: BoundingBox[],
  cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): string => {
  const words = toWords(boxes);
  if (words.length === 0) return '';

  const doc = buildReceiptDocument(words, cfg);

  return doc.sections
    .map((sec) => {
      if (sec.kind === 'text') {
        return sec.lines.join('\n');
      }

      const rows = sec.table.rows.map((r) => r.cells);
      const columnsCount = sec.table.columns.length;
      return toFixedWidthTable(rows, columnsCount);
    })
    .filter(Boolean)
    .join('\n\n');
};

export const formatBoxesAsSectionedMarkdown = (
  boxes: BoundingBox[],
  cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): string => {
  const words = toWords(boxes);
  if (words.length === 0) return '';

  const doc = buildReceiptDocument(words, cfg);

  const getSectionTitle = (sec: (typeof doc.sections)[number], idx: number): string => {
    const text =
      sec.kind === 'text'
        ? sec.lines.join('\n')
        : sec.table.rows.map((r) => r.cells.join(' ')).join('\n');

    const t = text.toLowerCase();

    const matches = (re: RegExp): number => (t.match(re) || []).length;
    const amountLikeCount = matches(/\b-?\d+[\d\.,]*\d\b/g);

    const score: Record<string, number> = {
      Encabezado: 0,
      'Datos de tienda': 0,
      Artículos: 0,
      'Total y pago': 0,
      Impuestos: 0,
      'Detalles de transacción': 0,
      'Pie / políticas': 0,
    };

    if (idx === 0) score.Encabezado += 2;
    if (sec.kind === 'text' && sec.lines.length <= 3 && amountLikeCount <= 1) score.Encabezado += 2;
    if (/[→]/.test(text)) score.Encabezado += 1;

    score['Datos de tienda'] += 2 * matches(/\b(s[ií]mi|kt|ehf|verslanir|borgart[úu]n|address|addr|tel)\b/g);
    score['Datos de tienda'] += matches(/\b(kvitt|f[æa]rsla|starfs|dags)\b/g);

    score.Artículos += sec.kind === 'table' ? 5 : 0;
    score.Artículos += matches(/\b(upph[æa]ð|l[ýy]sing|stk|kg|x\d+)\b/g);
    if (amountLikeCount >= 5) score.Artículos += 2;

    score['Total y pago'] += 2 * matches(/\b(samtals|total|heild|alls|grei[ðd]slukort|kort|visa|mastercard|amex)\b/g);
    if (matches(/\b(samtals|total|heild|alls)\b/g) > 0 && amountLikeCount >= 1) score['Total y pago'] += 3;

    score.Impuestos += 2 * matches(/\b(vsk|vat|tax|nett[oó])\b/g);
    if (matches(/\b(vsk)\b/g) > 0 && matches(/\bnett[oó]\b/g) > 0) score.Impuestos += 2;

    score['Detalles de transacción'] += 2 * matches(/\b(sala|f[æa]rsluhirdir|landsbankinn|bank|terminal|auth)\b/g);
    if (matches(/\*{4,}/g) > 0) score['Detalles de transacción'] += 2;
    if (matches(/\b\d{4}-\d{2}-\d{2}t\d{2}\s*:\s*\d{2}\s*:\s*\d{2}\b/g) > 0) score['Detalles de transacción'] += 2;

    score['Pie / políticas'] += 2 * matches(/\b(www\.|velkom|[þt]akk|skila[ðd]|einungis|kassakvittun|framv[íi]sun)\b/g);

    let bestTitle = `Section ${idx + 1}`;
    let bestScore = 0;
    for (const [title, s] of Object.entries(score)) {
      if (s > bestScore) {
        bestScore = s;
        bestTitle = title;
      }
    }

    return bestTitle;
  };

  const parts: string[] = ['## Extracted Receipt'];

  doc.sections.forEach((sec, idx) => {
    parts.push(`\n### ${getSectionTitle(sec, idx)}`);

    if (sec.kind === 'text') {
      parts.push('```text');
      parts.push(sec.lines.join('\n'));
      parts.push('```');
      return;
    }

    parts.push(receiptTableToMarkdown(sec.table));
  });

  return parts.join('\n');
};

export const buildSectionedJson = (boxes: BoundingBox[], cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG) => {
  const words = toWords(boxes);
  const globalMedianHeight = median(words.map((w) => w.height)) || 0;

  return {
    document: buildReceiptDocument(words, cfg),
    meta: {
      words_count: words.length,
      median_box_height: globalMedianHeight,
    },
    config: cfg,
  };
};
