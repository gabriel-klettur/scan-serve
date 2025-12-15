import { useMemo } from 'react';
import { cn } from '@/lib/utils';

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

export const HighlightedPre = (props: {
  text: string;
  highlight?: string | null;
  className?: string;
  highlightClassName?: string;
}): JSX.Element => {
  const { text, highlight, className, highlightClassName } = props;
  const hl = (highlight || '').trim();

  const parts = useMemo(() => {
    if (!hl || hl.length < 2) {
      return [{ text, match: false }];
    }
    return splitByHighlight(text, hl);
  }, [hl, text]);

  return (
    <pre
      className={cn(
        'text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed',
        className,
      )}
    >
      {parts.map((p, idx) => {
        if (!p.match) {
          return <span key={`p-${idx}`}>{p.text}</span>;
        }

        return (
          <span
            key={`p-${idx}`}
            className={cn('rounded-sm bg-yellow-200/50 px-0.5', highlightClassName)}
          >
            {p.text}
          </span>
        );
      })}
    </pre>
  );
};
