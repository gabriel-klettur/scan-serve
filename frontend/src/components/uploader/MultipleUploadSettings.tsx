import { motion } from 'framer-motion';
import { Cpu, Sparkles, Zap, Mail, Clock, Bell, BellOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useUploadSettingsStore,
  PROCESSING_ESTIMATES,
  type NotificationType,
} from '@/store/uploadSettingsStore';
import type { OcrEngine } from '@/services/api';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface EngineOption {
  id: OcrEngine;
  name: string;
  description: string;
  icon: typeof Cpu;
  badge?: string;
  parallelSupport: boolean;
}

const engineOptions: EngineOption[] = [
  {
    id: 'vision',
    name: 'Google Vision (AI)',
    description: 'Cloud-based, high accuracy',
    icon: Sparkles,
    badge: 'Recommended',
    parallelSupport: true,
  },
  {
    id: 'easyocr',
    name: 'EasyOCR (Local)',
    description: 'Offline processing, faster',
    icon: Cpu,
    parallelSupport: false,
  },
];

const notificationOptions: { value: NotificationType; label: string; description: string }[] = [
  { value: 'none', label: 'No notifications', description: 'Process silently' },
  { value: 'per-image', label: 'Per image', description: 'Notify when each image completes' },
  { value: 'all-complete', label: 'All complete', description: 'Notify when batch finishes' },
];

/**
 * Formats seconds into a human-readable duration string.
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `~${mins} min`;
  return `~${mins}m ${secs}s`;
};

interface MultipleUploadSettingsProps {
  fileCount?: number;
}

/**
 * Settings panel for multiple file upload mode.
 * Includes OCR engine selection, AI enhancement, time estimates, and email notifications.
 */
export const MultipleUploadSettings = ({ fileCount = 0 }: MultipleUploadSettingsProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const {
    selectedEngine,
    applyAiEnhancement,
    emailNotification,
    notificationEmail,
    setSelectedEngine,
    setApplyAiEnhancement,
    setEmailNotification,
    setNotificationEmail,
  } = useUploadSettingsStore();

  const estimatedTimePerImage = applyAiEnhancement
    ? PROCESSING_ESTIMATES.withAiEnhancement
    : PROCESSING_ESTIMATES.ocrOnly;

  const totalEstimatedTime = fileCount > 0 ? estimatedTimePerImage * fileCount : estimatedTimePerImage;
  const supportsParallel = engineOptions.find((e) => e.id === selectedEngine)?.parallelSupport ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border"
    >
      {/* OCR Engine Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">OCR Engine</Label>
        <div className="grid grid-cols-2 gap-2 auto-rows-fr">
          {engineOptions.map((engine) => {
            const Icon = engine.icon;
            const isSelected = selectedEngine === engine.id;

            return (
              <button
                key={engine.id}
                onClick={() => setSelectedEngine(engine.id)}
                className={cn(
                  'relative flex flex-col items-start gap-1 p-3 rounded-lg border transition-all duration-200 h-full',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                  isSelected
                    ? 'border-primary/50 bg-primary/10 shadow-glow'
                    : 'border-border bg-card/50 hover:border-primary/30 hover:bg-secondary/50'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {engine.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{engine.description}</span>
                {engine.badge && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary border border-primary/30">
                    {engine.badge}
                  </span>
                )}
                {engine.parallelSupport && (
                  <span className="inline-flex items-center gap-1 mt-auto text-[10px] text-muted-foreground">
                    <Users className="w-3 h-3" />
                    Parallel processing
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Enhancement Toggle with Time Estimate */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              applyAiEnhancement
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <Label
              htmlFor="ai-enhancement"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              AI Enhancement
            </Label>
            <p className="text-xs text-muted-foreground">Auto-parse fields after OCR scan</p>
          </div>
        </div>
        <Switch
          id="ai-enhancement"
          checked={applyAiEnhancement}
          onCheckedChange={setApplyAiEnhancement}
        />
      </div>

      {/* Time Estimate Info */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
        <Clock className="w-4 h-4 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-warning font-medium">Estimated Processing Time</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(estimatedTimePerImage)} per image
            {fileCount > 0 && (
              <>
                {' • '}
                <span className="text-foreground font-medium">
                  {formatDuration(supportsParallel ? estimatedTimePerImage : totalEstimatedTime)} total
                </span>
                {supportsParallel && ' (parallel)'}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <span className="text-sm font-medium text-muted-foreground">
            Notification Settings
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              advancedOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* Email Notification Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Email Notifications
            </Label>
            <Select
              value={emailNotification}
              onValueChange={(v) => setEmailNotification(v as NotificationType)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {notificationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.value === 'none' ? (
                        <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-primary" />
                      )}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Input (shown if notifications enabled) */}
          {emailNotification !== 'none' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="notification-email" className="text-xs font-medium text-muted-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="your@email.com"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {emailNotification === 'per-image'
                  ? "You'll receive an email when each receipt is processed."
                  : "You'll receive one email when all receipts are done."}
              </p>
            </motion.div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};
