import type { LayoutConfig } from './config';
import { DEFAULT_LAYOUT_CONFIG } from './config';
import { median } from './geometry';
import type { WordBox } from './types';

export const groupWordsIntoRows = (words: WordBox[], cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG): WordBox[][] => {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => a.yCenter - b.yCenter || a.x1 - b.x1);
  const globalMedianHeight = median(sorted.map((w) => w.height)) || 12;
  const yThreshold = globalMedianHeight * cfg.y_row_threshold_factor;

  const rows: WordBox[][] = [];
  let currentRow: WordBox[] = [];
  let rowY = 0;

  for (const w of sorted) {
    if (currentRow.length === 0) {
      currentRow = [w];
      rowY = w.yCenter;
      continue;
    }

    if (Math.abs(w.yCenter - rowY) <= yThreshold) {
      currentRow.push(w);
      rowY = (rowY * (currentRow.length - 1) + w.yCenter) / currentRow.length;
      continue;
    }

    rows.push(currentRow);
    currentRow = [w];
    rowY = w.yCenter;
  }

  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
};

export const renderRowAsText = (row: WordBox[], gapFactor = 2.2): string => {
  const sorted = [...row].sort((a, b) => a.x1 - b.x1);
  const rowMedianHeight = median(sorted.map((w) => w.height)) || 12;

  let line = '';
  let prev: WordBox | null = null;

  for (const w of sorted) {
    if (!prev) {
      line = w.text;
      prev = w;
      continue;
    }

    const gap = w.x1 - prev.x2;
    const spacer = gap > rowMedianHeight * gapFactor ? '    ' : gap > rowMedianHeight * (gapFactor / 2) ? '  ' : ' ';
    line += spacer + w.text;
    prev = w;
  }

  return line.trim();
};
