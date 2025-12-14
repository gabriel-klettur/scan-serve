import type { LayoutConfig } from './config';
import { DEFAULT_LAYOUT_CONFIG } from './config';
import { alignCellsToAnchors, inferColumnAnchors } from './columns';
import { inferColumnsCount, normalizeCellsToCount, parseAmount, splitRowIntoCells } from './cells';
import { median } from './geometry';
import { groupWordsIntoRows, renderRowAsText } from './rows';
import type { ReceiptDocument, ReceiptSection, ReceiptTable, WordBox } from './types';

const KEYWORD_BREAKS = ['samtals', 'total', 'upphæð', 'vsk', 'iva', 'subtotal'];

const rowBounds = (row: WordBox[]) => {
  const top = Math.min(...row.map((w) => w.y1));
  const bottom = Math.max(...row.map((w) => w.y2));
  const text = row.map((w) => w.text).join(' ').trim();
  return { top, bottom, text };
};

const isKeywordBreakRow = (text: string): boolean => {
  const t = text.toLowerCase();
  return KEYWORD_BREAKS.some((k) => t.includes(k));
};

export const buildReceiptSections = (
  words: WordBox[],
  cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): ReceiptSection[] => {
  const rows = groupWordsIntoRows(words, cfg);
  if (rows.length === 0) return [];

  const globalMedianHeight = median(words.map((w) => w.height)) || 12;
  const gapBase = globalMedianHeight * cfg.cell_gap_factor;

  const sections: WordBox[][][] = [];
  let current: WordBox[][] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const cur = rowBounds(row);

    const prev = i > 0 ? rowBounds(rows[i - 1]) : null;
    const verticalGap = prev ? cur.top - prev.bottom : 0;

    const hardBreak = verticalGap > globalMedianHeight * cfg.section_vertical_gap_factor;
    const keywordBreak = prev ? !isKeywordBreakRow(prev.text) && isKeywordBreakRow(cur.text) : false;

    if ((hardBreak || keywordBreak) && current.length > 0) {
      sections.push(current);
      current = [];
    }

    current.push(row);
  }

  if (current.length > 0) sections.push(current);

  const out: ReceiptSection[] = [];

  for (const secRows of sections) {
    const split = secRows.map((r) => splitRowIntoCells(r, gapBase));
    const cellRows = split.map((s) => s.cells);

    const multiCell = cellRows.filter((r) => r.length >= 2).length;
    const lastNumeric = cellRows.filter((r) => {
      const last = r.at(-1);
      return last ? parseAmount(last) !== null : false;
    }).length;

    const likelyTable =
      cellRows.length >= cfg.table_min_rows &&
      multiCell / cellRows.length >= cfg.table_multicell_ratio &&
      (multiCell === 0 ? false : lastNumeric / multiCell >= cfg.table_numeric_lastcell_ratio);

    if (!likelyTable) {
      const lines = secRows
        .map((r) => renderRowAsText(r, cfg.cell_gap_factor))
        .filter((ln) => ln.trim().length > 0);
      out.push({ kind: 'text', lines });
      continue;
    }

    const anchors = inferColumnAnchors(split, globalMedianHeight, cfg);
    const columnsCount = anchors.length > 0 ? anchors.length : inferColumnsCount(cellRows, cfg);
    const columns = Array.from({ length: columnsCount }, (_, i) => `col_${i + 1}`);

    const tableRows = split.map((r) => {
      const aligned = anchors.length
        ? alignCellsToAnchors(r, anchors, globalMedianHeight, cfg)
        : normalizeCellsToCount(r.cells, columnsCount);
      const cells = normalizeCellsToCount(aligned, columnsCount);

      const last = cells.at(-1);
      const amount = last ? parseAmount(last) : null;
      const descriptionParts = amount !== null ? cells.slice(0, -1) : cells;
      const description = descriptionParts.join(' ').trim();

      return {
        cells,
        description: description || undefined,
        amount: amount ?? undefined,
        amount_raw: amount !== null ? last : undefined,
      };
    });

    const table: ReceiptTable = {
      columns,
      anchors: anchors.length ? anchors : undefined,
      rows: tableRows,
    };

    out.push({ kind: 'table', table });
  }

  return out;
};

export const buildReceiptDocument = (
  words: WordBox[],
  cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
): ReceiptDocument => {
  return { sections: buildReceiptSections(words, cfg) };
};
