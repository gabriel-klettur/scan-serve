import { motion } from 'framer-motion';
import { Calendar, Store, DollarSign, HelpCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useOCRStore } from '@/store/ocrStore';

export const OCRFields = () => {
  const { result, aiResult } = useOCRStore();

  if (!result?.fields) return null;

  const totalValue = useMemo(() => {
    const parseAmount = (raw: string): number | null => {
      let s = raw.trim();
      if (!s) return null;
      s = s.replace(/[^0-9,\.\-]/g, '');
      if (!s || s === '-' || s === '.' || s === ',') return null;
      const neg = s.startsWith('-');
      s = s.replace(/^-+/, '');
      if (!s) return null;

      if (s.includes('.') && s.includes(',')) {
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        const thousandsSep = lastDot > lastComma ? ',' : '.';
        const decimalSep = lastDot > lastComma ? '.' : ',';
        s = s.split(thousandsSep).join('');
        s = s.split(decimalSep).join('.');
        const v = Number.parseFloat(s);
        return Number.isFinite(v) ? (neg ? -v : v) : null;
      }

      const isThousandGrouped = (sep: '.' | ','): boolean => {
        const parts = s.split(sep);
        return parts.length >= 2 && parts.slice(1).every((p) => p.length === 3);
      };

      if (s.includes('.') && isThousandGrouped('.')) {
        const v = Number.parseFloat(s.split('.').join(''));
        return Number.isFinite(v) ? (neg ? -v : v) : null;
      }
      if (s.includes(',') && isThousandGrouped(',')) {
        const v = Number.parseFloat(s.split(',').join(''));
        return Number.isFinite(v) ? (neg ? -v : v) : null;
      }

      if (s.includes(',')) {
        const v = Number.parseFloat(s.replace(/,/g, '.'));
        return Number.isFinite(v) ? (neg ? -v : v) : null;
      }

      const v = Number.parseFloat(s);
      return Number.isFinite(v) ? (neg ? -v : v) : null;
    };

    const extractAmounts = (line: string): number[] => {
      const tokens = line.match(/-?\d[\d\.,]*/g) ?? [];
      const out: number[] = [];
      tokens.forEach((t) => {
        const v = parseAmount(t);
        if (typeof v === 'number') out.push(v);
      });
      return out;
    };

    if (typeof aiResult?.fields?.total === 'number') return aiResult.fields.total;

    const sourceText = (aiResult?.text_clean || result.text_raw || '').toString();
    const lines = sourceText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const ln of lines) {
      if (ln.toLowerCase().includes('samtals')) {
        const amts = extractAmounts(ln);
        if (amts.length) return Math.abs(amts[amts.length - 1]);
      }
    }

    for (const ln of lines) {
      if (/\bkort\b/i.test(ln)) {
        const amts = extractAmounts(ln);
        if (amts.length) return Math.abs(amts[amts.length - 1]);
      }
    }

    return typeof result.fields.total === 'number' ? result.fields.total : null;
  }, [aiResult?.fields?.total, aiResult?.text_clean, result.fields.total, result.text_raw]);

  const fields = [
    {
      icon: Store,
      label: 'Merchant',
      value: aiResult?.fields?.merchant || result.fields.merchant,
      color: 'text-primary',
    },
    {
      icon: Calendar,
      label: 'Date',
      value: aiResult?.fields?.date || result.fields.date,
      color: 'text-warning',
    },
    {
      icon: DollarSign,
      label: 'Total',
      value: typeof totalValue === 'number' ? totalValue.toFixed(2) : undefined,
      color: 'text-success',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Extracted Fields
      </h3>
      
      <div className="grid gap-3">
        {fields.map((field, index) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className={`p-2 rounded-lg bg-card ${field.color}`}>
              <field.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{field.label}</p>
              {field.value ? (
                <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <HelpCircle className="w-3 h-3" />
                  <span className="text-xs">Not detected</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
