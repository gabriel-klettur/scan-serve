import type { ReceiptTable } from './types';

export const receiptTableToMarkdown = (table: ReceiptTable): string => {
  const header = `| ${table.columns.join(' | ')} |`;
  const sep = `| ${table.columns.map(() => '---').join(' | ')} |`;
  const rows = table.rows.map((r) => {
    const padded = table.columns.map((_, i) => (r.cells[i] ?? '').replace(/\|/g, '\\|'));
    return `| ${padded.join(' | ')} |`;
  });
  return [header, sep, ...rows].join('\n');
};
