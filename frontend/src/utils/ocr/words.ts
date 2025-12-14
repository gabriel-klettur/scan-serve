import type { BoundingBox } from '@/types/ocr';

import { rectFromBbox } from './geometry';
import type { WordBox } from './types';

export const toWords = (boxes: BoundingBox[]): WordBox[] =>
  boxes
    .filter((b) => Boolean(b.text?.trim()))
    .map((b) => {
      const { x1, y1, x2, y2 } = rectFromBbox(b.bbox);
      const height = Math.max(1, y2 - y1);
      return {
        text: b.text.trim(),
        x1,
        y1,
        x2,
        y2,
        yCenter: (y1 + y2) / 2,
        height,
      };
    });
