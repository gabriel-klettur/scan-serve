import type { WordBox } from './types';

import type { LayoutConfig } from './config';
import { DEFAULT_LAYOUT_CONFIG } from './config';

export const splitRowIntoCells = (
  row: WordBox[],
  gapBase: number,
): {
  cells: string[];
  cellX: number[];
} => {
  const sorted = [...row].sort((a, b) => a.x1 - b.x1);
  const cells: string[] = [];
  const cellX: number[] = [];

  let current: string[] = [];
  let currentX = 0;
  let prev: WordBox | null = null;

  for (const w of sorted) {
    if (!prev) {
      current = [w.text];
      currentX = w.x1;
      prev = w;
      continue;
    }

    const gap = w.x1 - prev.x2;
    if (gap > gapBase) {
      const cellText = current.join(' ').trim();
      if (cellText) {
        cells.push(cellText);
        cellX.push(currentX);
      }
      current = [w.text];
      currentX = w.x1;
      prev = w;
      continue;
    }

    current.push(w.text);
    prev = w;
  }

  const last = current.join(' ').trim();
  if (last) {
    cells.push(last);
    cellX.push(currentX);
  }

  return { cells, cellX };
};

export const parseAmount = (value: string): number | null => {
  const cleaned = value.replace(/[^0-9,\.\-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

export const inferColumnsCount = (rows: string[][], cfg: LayoutConfig = DEFAULT_LAYOUT_CONFIG): number => {
  const maxCells = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return Math.max(1, Math.min(maxCells, cfg.max_columns));
};

export const normalizeCellsToCount = (cells: string[], count: number): string[] => {
  if (count <= 0) return [];
  const out = cells.slice(0, count);
  while (out.length < count) out.push('');
  return out;
};

export const toFixedWidthTable = (rows: string[][], columnsCount: number): string => {
  const widths = Array.from({ length: columnsCount }, (_, i) => {
    const colMax = rows.reduce((m, r) => Math.max(m, (r[i] ?? '').length), 0);
    return Math.min(Math.max(colMax, 6), 40);
  });

  return rows
    .map((r) => {
      return widths
        .map((w, i) => {
          const v = (r[i] ?? '').slice(0, w);
          return v.padEnd(w, ' ');
        })
        .join('  ')
        .trimEnd();
    })
    .join('\n');
};
