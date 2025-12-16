import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image,
  X,
  AlertCircle,
  Play,
  Loader2,
  Camera,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  StopCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOCRStore } from '@/store/ocrStore';
import { useScanResultsStore } from '@/store/scanResultsStore';
import { useUploadSettingsStore, PROCESSING_ESTIMATES } from '@/store/uploadSettingsStore';
import { validateImageFile, fileToDataUrl } from '@/utils/image';
import {
  createReceiptOnServer,
  sendPerImageNotification,
  sendBatchCompleteNotification,
} from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createReceipt } from '@/features/receipts/db/receiptsRepo';
import { MultipleUploadSettings } from './MultipleUploadSettings';
import { BatchCameraCapture } from './BatchCameraCapture';
import { Progress } from '@/components/ui/progress';

export interface PendingFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

/**
 * Formats seconds into a human-readable duration string.
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

/**
 * Multiple file uploader component for batch processing receipts.
 * Supports parallel processing, camera capture, and email notifications.
 */
export const MultipleImageUploader = () => {
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { setStatus, setOriginalImage, setResult, setQueueInfo } = useOCRStore();
  const { addTab } = useScanResultsStore();
  const { selectedEngine, applyAiEnhancement, emailNotification, notificationEmail } =
    useUploadSettingsStore();

  // Check if parallel processing is supported (only for Google Vision)
  const supportsParallel = selectedEngine === 'vision';

  const addFiles = useCallback(async (files: File[]) => {
    setValidationError(null);
    const newPendingFiles: PendingFile[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setValidationError(`${file.name}: ${validation.error}`);
        continue;
      }

      const preview = await fileToDataUrl(file);
      newPendingFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        preview,
        status: 'pending',
      });
    }

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await addFiles(acceptedFiles);
    },
    [addFiles]
  );

  const handleCameraCapture = useCallback(
    async (file: File) => {
      await addFiles([file]);
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    disabled: isProcessing,
  });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setPendingFiles([]);
    setValidationError(null);
  };

  const cancelProcessing = () => {
    abortController?.abort();
    setIsProcessing(false);
    toast({
      title: 'Processing Cancelled',
      description: 'Batch processing was stopped.',
      variant: 'destructive',
    });
  };

  /**
   * Process a single file and return the result.
   */
  const processFile = async (pendingFile: PendingFile): Promise<boolean> => {
    try {
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === pendingFile.id ? { ...f, status: 'processing' } : f))
      );

      const ocrResult = await createReceiptOnServer(pendingFile.file, selectedEngine, (info) => {
        setQueueInfo(info.status, info.queuePosition ?? null);
      });

      // Add tab to header
      addTab({
        fileName: pendingFile.file.name,
        thumbnailUrl: pendingFile.preview,
        originalImageUrl: pendingFile.preview,
        ocrResult,
        aiResult: null,
        aiStageResults: {},
        folder: undefined,
      });

      // Save to IndexedDB
      try {
        await createReceipt({
          file: pendingFile.file,
          ocr: ocrResult,
        });
      } catch (dbErr) {
        console.error('Could not save to IndexedDB:', dbErr);
      }

      setPendingFiles((prev) =>
        prev.map((f) => (f.id === pendingFile.id ? { ...f, status: 'success' } : f))
      );

      // Send per-image email notification if enabled
      if (emailNotification === 'per-image' && notificationEmail) {
        sendPerImageNotification(notificationEmail, pendingFile.file.name).catch((err) =>
          console.error('Failed to send per-image notification:', err)
        );
      }

      return true;
    } catch (err) {
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === pendingFile.id
            ? {
                ...f,
                status: 'error',
                error: err instanceof Error ? err.message : 'Processing failed',
              }
            : f
        )
      );
      return false;
    }
  };

  /**
   * Process all files - parallel for Google Vision, sequential for EasyOCR.
   */
  const processAllFiles = async () => {
    const filesToProcess = pendingFiles.filter((f) => f.status === 'pending');
    if (filesToProcess.length === 0) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsProcessing(true);
    setProcessedCount(0);

    // Show live processing in Results while tabs are being added.
    navigate('/results');

    let successCount = 0;

    if (supportsParallel) {
      // Parallel processing for Google Vision
      const batchSize = 5; // Process 5 at a time to avoid overwhelming the API
      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        if (controller.signal.aborted) break;

        const batch = filesToProcess.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((f) => processFile(f)));
        successCount += results.filter(Boolean).length;
        setProcessedCount((prev) => prev + batch.length);
      }
    } else {
      // Sequential processing for EasyOCR
      for (let i = 0; i < filesToProcess.length; i++) {
        if (controller.signal.aborted) break;

        const success = await processFile(filesToProcess[i]);
        if (success) successCount++;
        setProcessedCount(i + 1);
      }
    }

    setIsProcessing(false);
    setAbortController(null);

    // Send all-complete email notification if enabled
    if (emailNotification === 'all-complete' && notificationEmail) {
      const errorCount = filesToProcess.length - successCount;
      sendBatchCompleteNotification(
        notificationEmail,
        filesToProcess.length,
        successCount,
        errorCount
      ).catch((err) => console.error('Failed to send batch notification:', err));
    }

    toast({
      title: 'Batch Processing Complete',
      description: `${successCount} of ${filesToProcess.length} receipts processed successfully.`,
    });

    // Update OCR store with last result for display
    const lastSuccess = pendingFiles.find((f) => f.status === 'success');
    if (lastSuccess) {
      setOriginalImage(lastSuccess.preview);
      setStatus('success');
    }

    // Navigate to results if any successful
    if (successCount > 0) {
      navigate('/results');
    }
  };

  const pendingCount = pendingFiles.filter((f) => f.status === 'pending').length;
  const successCount = pendingFiles.filter((f) => f.status === 'success').length;
  const errorCount = pendingFiles.filter((f) => f.status === 'error').length;
  const progress = pendingFiles.length > 0 ? (processedCount / pendingFiles.length) * 100 : 0;

  // Calculate estimated time
  const estimatedTimePerImage = applyAiEnhancement
    ? PROCESSING_ESTIMATES.withAiEnhancement
    : PROCESSING_ESTIMATES.ocrOnly;
  const totalEstimatedTime = supportsParallel
    ? estimatedTimePerImage
    : estimatedTimePerImage * pendingCount;

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      <MultipleUploadSettings fileCount={pendingCount} />

      {/* Camera Capture */}
      <AnimatePresence>
        {showCamera && (
          <BatchCameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
            capturedCount={pendingFiles.length}
            disabled={isProcessing}
          />
        )}
      </AnimatePresence>

      {/* Dropzone & Camera Toggle */}
      {!showCamera && (
        <div className="space-y-2">
          <div
            {...getRootProps()}
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group',
              'min-h-[280px] flex flex-col items-center justify-center p-6',
              isDragActive
                ? 'border-primary bg-primary/5 shadow-glow'
                : 'border-border hover:border-primary/50 hover:bg-secondary/30',
              isProcessing && 'pointer-events-none opacity-60'
            )}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isDragActive ? (
                <motion.div
                  key="drag"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="w-12 h-12 mx-auto mb-3 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
                  >
                    <Image className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                  <p className="text-base font-medium text-primary">Drop images here</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop multiple receipts here
                  </p>
                  <p className="text-xs text-muted-foreground">or click to browse files</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Camera Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowCamera(true)}
            disabled={isProcessing}
          >
            <Camera className="w-4 h-4" />
            Take Photos Continuously
          </Button>
        </div>
      )}

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
              </span>
              {successCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  {successCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="w-3 h-3" />
                  {errorCount}
                </span>
              )}
            </div>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Processing {processedCount} of {pendingFiles.length}...
                </span>
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {supportsParallel ? 'Parallel' : 'Sequential'}
                </span>
              </div>
            </div>
          )}

          {/* File Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
            <AnimatePresence mode="popLayout">
              {pendingFiles.map((pf) => (
                <motion.div
                  key={pf.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <div
                    className={cn(
                      'aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
                      pf.status === 'pending' && 'border-border',
                      pf.status === 'processing' && 'border-primary shadow-glow',
                      pf.status === 'success' && 'border-success',
                      pf.status === 'error' && 'border-destructive'
                    )}
                  >
                    <img
                      src={pf.preview}
                      alt={pf.file.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Overlay */}
                    {pf.status === 'processing' && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    )}
                    {pf.status === 'success' && (
                      <div className="absolute inset-0 bg-success/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                    )}
                    {pf.status === 'error' && (
                      <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  {pf.status === 'pending' && !isProcessing && (
                    <button
                      onClick={() => removeFile(pf.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Time Estimate & Actions */}
          {pendingCount > 0 && !isProcessing && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Est. {formatDuration(totalEstimatedTime)}
                  {supportsParallel && pendingCount > 1 && ' (parallel)'}
                </span>
              </div>
              <Button onClick={processAllFiles} className="gap-2">
                <Play className="w-4 h-4" />
                Process {pendingCount} Receipt{pendingCount !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {/* Cancel Button during processing */}
          {isProcessing && (
            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="destructive" size="sm" onClick={cancelProcessing} className="gap-2">
                <StopCircle className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Validation Error */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive">{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
