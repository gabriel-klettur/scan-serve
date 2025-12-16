import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Feather, FileText, ListChecks } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOCRStore } from '@/store/ocrStore';

type StageMeta = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const DEFAULT_STAGE_ORDER: StageMeta[] = [
  { key: 'final', label: 'Final', Icon: CheckCircle2 },
  { key: 'organizer', label: 'Organizer', Icon: FileText },
  { key: 'auditor', label: 'Auditor', Icon: ListChecks },
  { key: 'stylist', label: 'Stylist', Icon: Feather },
];

const normalizeStageKey = (s: string): string => (s || '').trim().toLowerCase();

export const AiStageBar = (): JSX.Element | null => {
  const {
    result,
    aiStatus,
    aiStageResults,
    aiSelectedStage,
    aiStagePulseKey,
    aiStagePulseStage,
    aiActiveStageKey,
    setAiSelectedStage,
    setAiAutoFollowStage,
  } = useOCRStore();

  const hasReceipt = Boolean(result?.receiptId);

  const stages = useMemo(() => {
    const known = new Map(DEFAULT_STAGE_ORDER.map((s) => [s.key, s] as const));

    const dynamicKeys = Object.keys(aiStageResults || {})
      .map(normalizeStageKey)
      .filter(Boolean)
      .filter((k) => k !== 'final');

    dynamicKeys.forEach((k) => {
      if (!known.has(k)) {
        known.set(k, { key: k, label: k, Icon: FileText });
      }
    });

    const order = ['final', 'organizer', 'auditor', 'stylist'];
    const knownKeys = Array.from(known.keys());
    const rest = knownKeys.filter((k) => !order.includes(k));

    const out: StageMeta[] = [];
    [...order, ...rest].forEach((k) => {
      const meta = known.get(k);
      if (meta) out.push(meta);
    });

    return out;
  }, [aiStageResults]);

  const selectedKey = normalizeStageKey(aiSelectedStage || '') || 'final';
  const activeKey = normalizeStageKey(aiActiveStageKey || '');

  const [pulsingKey, setPulsingKey] = useState<string | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const lastPulseKeyRef = useRef<number>(0);

  useEffect(() => {
    if (!aiStagePulseKey) return;
    if (aiStagePulseKey === lastPulseKeyRef.current) return;
    lastPulseKeyRef.current = aiStagePulseKey;

    const stage = normalizeStageKey(aiStagePulseStage || '');
    if (!stage) return;

    setPulsingKey(stage);
    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsingKey(null);
      pulseTimerRef.current = null;
    }, 1200);
  }, [aiStagePulseKey, aiStagePulseStage]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, []);

  const isAiProcessing = aiStatus === 'processing' || aiStatus === 'uploading';

  const handleSelect = (key: string) => {
    const norm = normalizeStageKey(key);
    setAiAutoFollowStage(false);
    setAiSelectedStage(norm === 'final' ? null : norm);
  };

  const isStageAvailable = (key: string): boolean => {
    if (key === 'final') return true;
    return Boolean(aiStageResults?.[key]);
  };

  if (!hasReceipt) return null;

  return (
    <div className="flex items-center gap-2">
      {stages.map((s) => {
        const key = normalizeStageKey(s.key);
        const available = isStageAvailable(key);
        const active = selectedKey === key;
        const pulsing = pulsingKey === key;
        const working = Boolean(activeKey) && activeKey === key;

        return (
          <Button
            key={key}
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleSelect(key)}
            disabled={!available && !isAiProcessing}
            title={
              !available
                ? 'Aún no hay resultado para esta etapa'
                : pulsing
                  ? 'Nuevo resultado recibido'
                  : working
                    ? 'Procesando esta etapa…'
                  : undefined
            }
            className={cn(
              'h-8 gap-2 px-2',
              !available && 'opacity-60',
              pulsing && 'ring-2 ring-primary/70 shadow-[0_0_14px_rgba(59,130,246,0.45)]',
              working &&
                'ring-1 ring-amber-200/40 shadow-[0_0_14px_rgba(253,230,138,0.20),0_0_8px_rgba(255,255,255,0.06)]',
            )}
          >
            <s.Icon
              className={cn('w-4 h-4', working && 'animate-spin [animation-duration:1.4s]')}
            />
            <span className="text-xs">{s.label}</span>
            {available && key !== 'final' && (
              <span
                className={cn(
                  'ml-1 inline-block h-1.5 w-1.5 rounded-full',
                  active ? 'bg-primary' : 'bg-foreground/40',
                )}
              />
            )}
            {working && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-200/80" />
            )}
          </Button>
        );
      })}
    </div>
  );
};
