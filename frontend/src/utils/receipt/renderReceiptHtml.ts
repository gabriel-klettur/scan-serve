import type { OCRFields } from '@/types/ocr';
import type { ReceiptDocument, ReceiptSection } from '@/utils/ocr/types';

const escapeHtml = (s: string): string =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const splitByHighlight = (text: string, highlight: string): Array<{ text: string; match: boolean }> => {
  const hay = text;
  const needle = highlight;
  const hayLower = hay.toLowerCase();
  const needleLower = needle.toLowerCase();

  const parts: Array<{ text: string; match: boolean }> = [];
  let i = 0;

  while (i < hay.length) {
    const idx = hayLower.indexOf(needleLower, i);
    if (idx < 0) {
      parts.push({ text: hay.slice(i), match: false });
      break;
    }

    if (idx > i) {
      parts.push({ text: hay.slice(i, idx), match: false });
    }

    parts.push({ text: hay.slice(idx, idx + needle.length), match: true });
    i = idx + needle.length;
  }

  return parts;
};

const renderHighlightedText = (text: string, highlight: string | null | undefined): string => {
  const hl = (highlight || '').trim();
  if (!hl || hl.length < 2) return escapeHtml(text);

  const parts = splitByHighlight(text || '', hl);
  if (!parts.some((p) => p.match)) return escapeHtml(text);

  return parts
    .map((p) => (p.match ? `<span class="hl">${escapeHtml(p.text)}</span>` : escapeHtml(p.text)))
    .join('');
};

const firstNonEmptyLine = (document: ReceiptDocument): string => {
  for (const sec of document.sections || []) {
    if (sec.kind !== 'text') continue;
    const ln = (sec.lines || []).find((l) => l.trim().length > 0);
    if (ln) return ln;
  }
  return '';
};

const isNumericLike = (s: string): boolean => /(\d+[\.,]\d{2}|\b\d+\b)/.test((s || '').trim());

const renderTextSection = (
  sec: Extract<ReceiptSection, { kind: 'text' }>,
  className: string,
  highlight: string | null | undefined,
): string => {
  const safe = (sec.lines || [])
    .map((ln) => renderHighlightedText(ln, highlight))
    .filter((ln) => ln.trim().length > 0);
  if (!safe.length) return '';
  return `<div class="${className}">${safe.map((ln) => `<div class="ln">${ln}</div>`).join('')}</div>`;
};

const renderTableSection = (sec: Extract<ReceiptSection, { kind: 'table' }>, highlight: string | null | undefined): string => {
  const table = sec.table;
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const columnsCount = Array.isArray(table?.columns) ? table.columns.length : 0;
  if (!rows.length || columnsCount <= 0) return '';

  const colTemplate = `repeat(${columnsCount}, minmax(0, 1fr))`;

  const body = rows
    .map((r) => {
      const cells = Array.isArray(r?.cells) ? r.cells : [];
      const normalized = Array.from({ length: columnsCount }, (_, i) => String(cells[i] ?? ''));
      const tds = normalized
        .map((cell, i) => {
          const safe = renderHighlightedText(cell, highlight);
          const right = i === columnsCount - 1 || isNumericLike(cell);
          return `<div class="td ${right ? 'right' : 'left'}">${safe}</div>`;
        })
        .join('');
      return `<div class="tr" style="grid-template-columns:${colTemplate}">${tds}</div>`;
    })
    .join('');

  return `<div class="tbl">${body}</div>`;
};

export const renderReceiptHtmlFromDocument = (args: {
  document: ReceiptDocument;
  fields?: OCRFields;
  fallbackText: string;
  highlight?: string | null;
}): string => {
  const { document, fields, fallbackText, highlight } = args;

  const safeFallbackText = renderHighlightedText(fallbackText, highlight);
  if (!document?.sections?.length) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .wrap { padding: 12px; }
    .ticket { width: 100%; background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); padding: 14px; }
    pre { margin: 0; white-space: pre-wrap; line-height: 1.25; font-size: 12px; }
    .hl { background: #fde68a; border-radius: 2px; padding: 0 2px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="ticket"><pre>${safeFallbackText}</pre></div>
  </div>
</body>
</html>`;
  }

  const headerMerchant = renderHighlightedText(fields?.merchant || firstNonEmptyLine(document), highlight);
  const headerDate = renderHighlightedText(fields?.date || '', highlight);
  const headerTotal = typeof fields?.total === 'number' ? renderHighlightedText(fields.total.toFixed(2), highlight) : '';

  const headerLines: string[] = [];
  if (headerMerchant) headerLines.push(`<div class="h1">${headerMerchant}</div>`);
  if (headerDate || headerTotal) {
    headerLines.push(
      `<div class="meta">${headerDate ? `<span>${headerDate}</span>` : '<span></span>'}${headerTotal ? `<span class="r">Total: ${headerTotal}</span>` : '<span></span>'}</div>`,
    );
  }

  const sectionsHtml = (document.sections || [])
    .map((sec, idx) => {
      if (sec.kind === 'text') {
        const cls = idx === 0 ? 'sec text muted' : 'sec text';
        return renderTextSection(sec, cls, highlight);
      }
      if (sec.kind === 'table') {
        return `<div class="sec">${renderTableSection(sec, highlight)}</div>`;
      }
      return '';
    })
    .filter(Boolean)
    .join('<div class="sep"></div>');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 12px; background: #fff; }
    .frame { display: flex; justify-content: center; }
    .ticket {
      width: 100%;
      max-width: 520px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: #111;
    }
    .h1 { text-align: center; font-weight: 700; font-size: 22px; line-height: 1.2; margin-bottom: 6px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #333; margin-bottom: 10px; }
    .meta .r { text-align: right; }
    .sep { height: 1px; background: rgba(0,0,0,0.10); margin: 10px 0; }
    .sec { font-size: 13px; line-height: 1.35; }
    .sec.text .ln { white-space: pre-wrap; }
    .sec.text.muted { color: #444; }
    .tbl { display: grid; gap: 6px; }
    .tr { display: grid; gap: 10px; align-items: baseline; }
    .td { white-space: pre-wrap; word-break: break-word; }
    .td.right { text-align: right; }
    .td.left { text-align: left; }
    .hl { background: #fde68a; border-radius: 2px; padding: 0 2px; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="ticket">
      ${headerLines.join('')}
      ${headerLines.length ? '<div class="sep"></div>' : ''}
      ${sectionsHtml}
    </div>
  </div>
</body>
</html>`;
};
