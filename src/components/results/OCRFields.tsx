import { motion } from 'framer-motion';
import { Calendar, Store, DollarSign, HelpCircle } from 'lucide-react';
import { useOCRStore } from '@/store/ocrStore';

export const OCRFields = () => {
  const { result } = useOCRStore();

  if (!result?.fields) return null;

  const fields = [
    {
      icon: Store,
      label: 'Merchant',
      value: result.fields.merchant,
      color: 'text-primary',
    },
    {
      icon: Calendar,
      label: 'Date',
      value: result.fields.date,
      color: 'text-warning',
    },
    {
      icon: DollarSign,
      label: 'Total',
      value: result.fields.total ? `S/. ${result.fields.total.toFixed(2)}` : undefined,
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
