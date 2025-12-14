import type { BoundingBox } from '@/types/ocr';

export type WordBox = {
  text: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  yCenter: number;
  height: number;
};

export type ReceiptRow = {
  cells: string[];
  description?: string;
  amount?: number;
  amount_raw?: string;
};

export type ReceiptTable = {
  columns: string[];
  anchors?: number[];
  rows: ReceiptRow[];
};

export type ReceiptSection =
  | {
      kind: 'text';
      lines: string[];
    }
  | {
      kind: 'table';
      table: ReceiptTable;
    };

export type ReceiptDocument = {
  sections: ReceiptSection[];
};

export type BoxesInput = BoundingBox[];
