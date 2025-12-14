export type { ReceiptDocument, ReceiptSection, ReceiptRow, ReceiptTable } from './ocr/types';

export {
  buildSectionedJson,
  formatBoxesAsSectionedMarkdown,
  formatBoxesAsSectionedText,
  formatBoxesAsTextLines,
} from './ocr/format';

export { receiptTableToMarkdown } from './ocr/markdown';
