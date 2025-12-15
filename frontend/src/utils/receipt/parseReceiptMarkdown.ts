import type { ReceiptDocument, ReceiptRow, ReceiptSection, ReceiptTable } from '@/utils/ocr/types';

const isTableSeparator = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed);
};

const splitMarkdownTableRow = (line: string): string[] => {
  const raw = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out: string[] = [];
  let buf = '';

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const prev = i > 0 ? raw[i - 1] : '';

    if (ch === '|' && prev !== '\\') {
      out.push(buf.trim().replace(/\\\|/g, '|'));
      buf = '';
      continue;
    }

    buf += ch;
  }

  out.push(buf.trim().replace(/\\\|/g, '|'));
  return out;
};

const pushTextSection = (sections: ReceiptSection[], lines: string[]) => {
  const cleaned = lines.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (cleaned.length === 0) return;
  sections.push({ kind: 'text', lines: cleaned });
};

const pushTableSection = (sections: ReceiptSection[], table: ReceiptTable) => {
  if (!Array.isArray(table.columns) || table.columns.length === 0) return;
  if (!Array.isArray(table.rows) || table.rows.length === 0) return;
  sections.push({ kind: 'table', table });
};

export const parseReceiptMarkdown = (markdown: string): ReceiptDocument => {
  const md = (markdown || '').replace(/\r\n/g, '\n');
  const lines = md.split('\n');

  const sections: ReceiptSection[] = [];
  let currentTextLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      pushTextSection(sections, currentTextLines);
      currentTextLines = [];
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      pushTextSection(sections, currentTextLines);
      currentTextLines = [];

      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        if (lines[i].trim().length > 0) codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) i += 1;

      pushTextSection(sections, codeLines);
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      pushTextSection(sections, currentTextLines);
      currentTextLines = [];

      const headerCells = splitMarkdownTableRow(line);
      const columns = headerCells.map((c) => c.trim());
      i += 2;

      const rows: ReceiptRow[] = [];
      while (i < lines.length) {
        const rowLine = lines[i];
        if (!rowLine.trim() || !rowLine.includes('|')) break;
        const cells = splitMarkdownTableRow(rowLine);
        rows.push({ cells: columns.map((_, idx) => String(cells[idx] ?? '').trim()) });
        i += 1;
      }

      pushTableSection(sections, { columns, rows });
      continue;
    }

    currentTextLines.push(line);
    i += 1;
  }

  pushTextSection(sections, currentTextLines);

  return { sections };
};
