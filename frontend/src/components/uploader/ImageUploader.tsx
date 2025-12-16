import { useCallback, useRef, useState, type ChangeEventHandler } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, AlertCircle, Camera, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOCRStore } from '@/store/ocrStore';
import { useScanResultsStore } from '@/store/scanResultsStore';
import { useUploadSettingsStore } from '@/store/uploadSettingsStore';
import { validateImageFile, fileToDataUrl } from '@/utils/image';
import { createReceiptOnServer, parseReceiptWithAI, type OcrEngine } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createReceipt } from '@/features/receipts/db/receiptsRepo';
import { CameraCapture } from '@/features/receipts/components/CameraCapture';
import { SingleUploadSettings } from './SingleUploadSettings';

export const ImageUploader = () => {
  const {
    status,
    result,
    originalImage,
    setStatus,
    setOriginalImage,
    setResult,
    setError,
    setQueueInfo,
    setAiStatus,
    setAiResult,
    setAiError,
    resetAiStages,
    resetAi,
    reset,
  } = useOCRStore();
  const { addTab, updateTab } = useScanResultsStore();
  const { selectedEngine, applyAiEnhancement } = useUploadSettingsStore();
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const captureInputRef = useRef<HTMLInputElement | null>(null);

  const isLikelyMobile = (() => {
    // Heuristic (feature detection) to prefer native camera UX on touch devices.
    // On desktop we prefer webcam preview (getUserMedia).
    if (typeof window === 'undefined') return false;

    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const ua = navigator.userAgent || '';
    const uaSuggestsMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(ua);

    return hasCoarsePointer || uaSuggestsMobile;
  })();

  const isProcessing = status === 'uploading' || status === 'processing';

  const handleUseCamera = () => {
    if (isProcessing) return;

    // Mobile: use native camera/file picker via input capture.
    if (isLikelyMobile) {
      setShowCamera(false);
      captureInputRef.current?.click();
      return;
    }

    // Desktop: prefer webcam preview via getUserMedia when available.
    if (navigator.mediaDevices?.getUserMedia) {
      setShowCamera((v) => !v);
      return;
    }

    // Fallback: open file picker.
    captureInputRef.current?.click();
  };

  const processImage = useCallback(async (file: File, engine: OcrEngine, fileName: string) => {
    try {
      resetAi();
      resetAiStages();
      setQueueInfo(null, null);
      setStatus('uploading');
      setValidationError(null);
      
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
      
      setStatus('processing');

      const ocrResult = await createReceiptOnServer(file, engine, (info) => {
        setQueueInfo(info.status, info.queuePosition ?? null);
      });
      setResult(ocrResult);

      // Add tab to the scan results tabs in the header
      const tabId = addTab({
        fileName: fileName || file.name,
        thumbnailUrl: dataUrl,
        originalImageUrl: dataUrl,
        ocrResult,
        aiResult: null,
        aiStageResults: {},
        folder: undefined,
      });

      // Optional: auto-run AI enhancement right after OCR (single mode)
      if (applyAiEnhancement) {
        if (ocrResult.receiptId) {
          try {
            setAiError(null);
            setAiResult(null);
            setAiStatus('processing');
            const parsed = await parseReceiptWithAI({
              receiptId: ocrResult.receiptId,
              text_raw: ocrResult.text_raw,
              fields: ocrResult.fields,
              boxes: ocrResult.boxes,
            });
            setAiResult(parsed);
            setAiStatus('success');
            updateTab(tabId, { aiResult: parsed });
          } catch (e) {
            setAiStatus('error');
            setAiError(e instanceof Error ? e.message : 'AI Enhancement failed');
          }
        } else {
          // No receiptId => AI parse endpoint won't be able to correlate; keep UX consistent.
          setAiStatus('idle');
        }
      }

      try {
        await createReceipt({
          file,
          ocr: ocrResult,
        });
        toast({
          title: 'Saved to Receipts',
          description: 'Stored locally in IndexedDB.',
        });
      } catch (dbErr) {
        toast({
          title: 'Could not save to Receipts',
          description: dbErr instanceof Error ? dbErr.message : 'IndexedDB error',
          variant: 'destructive',
        });
      }
      
    } catch (err) {
      setQueueInfo(null, null);
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    }
  }, [addTab, applyAiEnhancement, parseReceiptWithAI, resetAi, resetAiStages, setAiError, setAiResult, setAiStatus, setError, setOriginalImage, setQueueInfo, setResult, setStatus, updateTab]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    processImage(file, selectedEngine, file.name);
  }, [processImage, selectedEngine]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'processing',
  });

  const handleReset = () => {
    reset();
    setValidationError(null);
    setShowCamera(false);
  };

  const canViewResults = status === 'success' && Boolean(result) && Boolean(originalImage);

  const handleOpenResults = () => {
    if (!canViewResults) return;
    navigate('/results');
  };

  const handlePreviewKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!canViewResults) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenResults();
    }
  };

  const handleCaptureInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    setValidationError(null);
    processImage(file, selectedEngine, file.name);
    e.target.value = '';
  };

  if (status === 'success' && originalImage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleOpenResults}
        onKeyDown={handlePreviewKeyDown}
        role={canViewResults ? 'button' : undefined}
        tabIndex={canViewResults ? 0 : -1}
        className={cn(
          'relative rounded-xl overflow-hidden border border-border bg-card group',
          canViewResults &&
            'cursor-pointer hover:border-amber-200/50 hover:ring-1 hover:ring-amber-200/40 hover:shadow-[0_0_22px_rgba(253,230,138,0.18)]',
        )}
      >
        <img
          src={originalImage}
          alt="Uploaded receipt"
          className="w-full h-auto max-h-[300px] object-contain"
        />

        {canViewResults && (
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-background/10 to-transparent" />
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-background/70 border border-amber-200/30 backdrop-blur-sm text-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-amber-200/90" />
              <span className="text-xs font-medium">Open Results</span>
            </div>
          </div>
        )}

        <Button
          variant="icon"
          size="icon"
          className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-success/20 border border-success/30 backdrop-blur-sm">
          <span className="text-xs font-medium text-success">Processed</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <SingleUploadSettings disabled={isProcessing} />

      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
          "min-h-[280px] flex flex-col items-center justify-center p-8",
          isDragActive
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-border hover:border-primary/50 hover:bg-secondary/30",
          (status === 'uploading' || status === 'processing') && "pointer-events-none opacity-60"
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
                className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
              >
                <Image className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <p className="text-lg font-medium text-primary">Drop your image here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">
                Drag & drop your receipt
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-secondary">JPG</span>
                <span className="px-2 py-1 rounded bg-secondary">PNG</span>
                <span className="text-muted-foreground/60">Max 10MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end">
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCaptureInput}
          disabled={isProcessing}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCamera}
          disabled={isProcessing}
        >
          <Camera className="w-4 h-4" />
          {showCamera ? 'Close Camera' : 'Use Camera'}
        </Button>
      </div>

      {showCamera && (
        <CameraCapture
          disabled={isProcessing}
          onCapture={(file) => processImage(file, selectedEngine, file.name)}
        />
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
