import type { LayoutConfig } from './config';

export type SplitRow = {
  cells: string[];
  cellX: number[];
};

const mergeCloseAnchors = (xs: number[], threshold: number): number[] => {
  if (xs.length === 0) return [];
  const sorted = [...xs].sort((a, b) => a - b);

  const anchors: number[] = [sorted[0]];
  for (const x of sorted.slice(1)) {
    const last = anchors[anchors.length - 1];
    if (Math.abs(x - last) <= threshold) {
      anchors[anchors.length - 1] = (last + x) / 2;
    } else {
      anchors.push(x);
    }
  }

  return anchors;
};

export const inferColumnAnchors = (rows: SplitRow[], medianBoxHeight: number, cfg: LayoutConfig): number[] => {
  const xs = rows.flatMap((r) => r.cellX).filter((x) => Number.isFinite(x));
  if (xs.length === 0) return [];

  const threshold = Math.max(4, medianBoxHeight * cfg.anchor_merge_factor);
  const anchors = mergeCloseAnchors(xs, threshold);

  return anchors.slice(0, cfg.max_columns);
};

const nearestAnchorIndex = (anchors: number[], x: number): number => {
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < anchors.length; i += 1) {
    const d = Math.abs(anchors[i] - x);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  return bestIdx;
};

export const alignCellsToAnchors = (
  row: SplitRow,
  anchors: number[],
  medianBoxHeight: number,
  cfg: LayoutConfig,
): string[] => {
  if (anchors.length === 0) return row.cells;

  const maxDist = Math.max(8, medianBoxHeight * cfg.anchor_assign_max_dist_factor);
  const out = Array.from({ length: anchors.length }, () => '');

  for (let i = 0; i < row.cells.length; i += 1) {
    const cellText = row.cells[i] ?? '';
    const x = row.cellX[i] ?? anchors[0];

    const idx = nearestAnchorIndex(anchors, x);

    const dist = Math.abs(anchors[idx] - x);
    const targetIdx = dist <= maxDist ? idx : x < anchors[0] ? 0 : anchors.length - 1;

    out[targetIdx] = out[targetIdx] ? `${out[targetIdx]} ${cellText}` : cellText;
  }

  return out.map((s) => s.trim());
};
