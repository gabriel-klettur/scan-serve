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

  const parts: string[] = ['## Extracted Receipt'];

  doc.sections.forEach((sec, idx) => {
    parts.push(`\n### Section ${idx + 1}`);

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
