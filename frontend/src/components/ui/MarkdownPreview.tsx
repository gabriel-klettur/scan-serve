import React from 'react';

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'link'; label: string; href: string };

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

const maybeHighlight = (
  nodes: React.ReactNode[],
  highlight: string | null | undefined,
  keyPrefix: string,
): React.ReactNode[] => {
  const hl = (highlight || '').trim();
  if (!hl || hl.length < 2) return nodes;

  return nodes.map((n, idx) => {
    if (typeof n !== 'string') return n;

    const parts = splitByHighlight(n, hl);
    if (!parts.some((p) => p.match)) return n;

    return (
      <React.Fragment key={`${keyPrefix}-hl-${idx}`}>
        {parts.map((p, pIdx) =>
          p.match ? (
            <mark key={`${keyPrefix}-m-${idx}-${pIdx}`} className="rounded-sm bg-yellow-200/50 px-0.5">
              {p.text}
            </mark>
          ) : (
            <React.Fragment key={`${keyPrefix}-t-${idx}-${pIdx}`}>{p.text}</React.Fragment>
          ),
        )}
      </React.Fragment>
    );
  });
};

const tokenizeInline = (input: string): InlineToken[] => {
  if (!input) return [];

  const tokens: InlineToken[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'text', value: input.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ kind: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ kind: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({ kind: 'italic', value: raw.slice(1, -1) });
    } else if (raw.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      if (m) {
        tokens.push({ kind: 'link', label: m[1], href: m[2] });
      } else {
        tokens.push({ kind: 'text', value: raw });
      }
    } else {
      tokens.push({ kind: 'text', value: raw });
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < input.length) {
    tokens.push({ kind: 'text', value: input.slice(lastIndex) });
  }

  return tokens;
};

const renderInline = (input: string, keyPrefix: string): React.ReactNode[] => {
  const tokens = tokenizeInline(input);
  if (tokens.length === 0) return [input];

  return tokens.map((t, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (t.kind === 'text') return <React.Fragment key={key}>{t.value}</React.Fragment>;
    if (t.kind === 'code') return <code key={key}>{t.value}</code>;
    if (t.kind === 'bold') return <strong key={key}>{t.value}</strong>;
    if (t.kind === 'italic') return <em key={key}>{t.value}</em>;
    return (
      <a key={key} href={t.href} target="_blank" rel="noreferrer">
        {t.label}
      </a>
    );
  });
};

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const isTableSeparator = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed);
};

const parseTableRow = (line: string): string[] => {
  const raw = line.trim();
  const withoutEdges = raw.replace(/^\|/, '').replace(/\|$/, '');
  return withoutEdges.split('|').map((c) => c.trim());
};

const parseBlocks = (md: string): Block[] => {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  const isFenceStart = (l: string): boolean => l.trimStart().startsWith('```');
  const isUnordered = (l: string): boolean => /^\s*[-*+]\s+/.test(l);
  const isOrdered = (l: string): boolean => /^\s*\d+\.\s+/.test(l);
  const isHeading = (l: string): boolean => /^#{1,6}\s+/.test(l.trim());
  const isTableCandidate = (l: string): boolean => l.includes('|');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (isFenceStart(line)) {
      const fence = line.trimStart();
      const lang = fence.replace(/```/, '').trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !isFenceStart(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && isFenceStart(lines[i])) i += 1;
      blocks.push({ kind: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    if (isTableCandidate(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    if (isHeading(line)) {
      const trimmed = line.trim();
      const m = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      const level = (m?.[1]?.length ?? 2) as 1 | 2 | 3 | 4 | 5 | 6;
      const text = m?.[2] ?? trimmed;
      blocks.push({ kind: 'heading', level, text });
      i += 1;
      continue;
    }

    if (isUnordered(line)) {
      const items: string[] = [];
      while (i < lines.length && isUnordered(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (isOrdered(line)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isFenceStart(lines[i]) &&
      !isHeading(lines[i]) &&
      !isUnordered(lines[i]) &&
      !isOrdered(lines[i]) &&
      !(isTableCandidate(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
};

export interface MarkdownPreviewProps {
  markdown: string;
  highlight?: string | null;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, highlight }) => {
  const blocks = React.useMemo(() => parseBlocks(markdown), [markdown]);

  const proseStyle = React.useMemo(
    () =>
      ({
        ['--tw-prose-body' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-headings' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-lead' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-links' as any]: 'hsl(var(--primary))',
        ['--tw-prose-bold' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-counters' as any]: 'hsl(var(--muted-foreground))',
        ['--tw-prose-bullets' as any]: 'hsl(var(--muted-foreground))',
        ['--tw-prose-hr' as any]: 'hsl(var(--border))',
        ['--tw-prose-quotes' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-quote-borders' as any]: 'hsl(var(--border))',
        ['--tw-prose-captions' as any]: 'hsl(var(--muted-foreground))',
        ['--tw-prose-code' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-pre-code' as any]: 'hsl(var(--foreground))',
        ['--tw-prose-pre-bg' as any]: 'hsl(var(--muted))',
        ['--tw-prose-th-borders' as any]: 'hsl(var(--border))',
        ['--tw-prose-td-borders' as any]: 'hsl(var(--border))',
      }) as React.CSSProperties,
    [],
  );

  return (
    <div className="prose prose-sm max-w-none" style={proseStyle}>
      {blocks.map((b, idx) => {
        const key = `md-${idx}`;

        if (b.kind === 'heading') {
          const content = maybeHighlight(renderInline(b.text, key), highlight, key);
          if (b.level === 1) return <h1 key={key}>{content}</h1>;
          if (b.level === 2) return <h2 key={key}>{content}</h2>;
          if (b.level === 3) return <h3 key={key}>{content}</h3>;
          if (b.level === 4) return <h4 key={key}>{content}</h4>;
          if (b.level === 5) return <h5 key={key}>{content}</h5>;
          return <h6 key={key}>{content}</h6>;
        }

        if (b.kind === 'code') {
          const codeContent = maybeHighlight([b.code], highlight, `${key}-code`);
          return (
            <pre key={key} className="!my-4">
              <code className={b.lang ? `language-${b.lang}` : undefined}>{codeContent}</code>
            </pre>
          );
        }

        if (b.kind === 'ul') {
          return (
            <ul key={key}>
              {b.items.map((it, i) => (
                <li key={`${key}-li-${i}`}>
                  {maybeHighlight(renderInline(it, `${key}-li-${i}`), highlight, `${key}-li-${i}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (b.kind === 'ol') {
          return (
            <ol key={key}>
              {b.items.map((it, i) => (
                <li key={`${key}-li-${i}`}>
                  {maybeHighlight(renderInline(it, `${key}-li-${i}`), highlight, `${key}-li-${i}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (b.kind === 'table') {
          return (
            <div key={key} className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {b.header.map((h, i) => (
                      <th key={`${key}-th-${i}`}>
                        {maybeHighlight(renderInline(h, `${key}-th-${i}`), highlight, `${key}-th-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={`${key}-tr-${r}`}>
                      {row.map((cell, c) => (
                        <td key={`${key}-td-${r}-${c}`}>
                          {maybeHighlight(renderInline(cell, `${key}-td-${r}-${c}`), highlight, `${key}-td-${r}-${c}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={key}>{maybeHighlight(renderInline(b.text, key), highlight, key)}</p>;
      })}
    </div>
  );
};
