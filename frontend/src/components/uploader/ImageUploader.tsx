import { useCallback, useRef, useState, type ChangeEventHandler } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, AlertCircle, Camera } from 'lucide-react';
import { useOCRStore } from '@/store/ocrStore';
import { validateImageFile, fileToDataUrl } from '@/utils/image';
import { createReceiptOnServer, type OcrEngine } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { createReceipt } from '@/features/receipts/db/receiptsRepo';
import { CameraCapture } from '@/features/receipts/components/CameraCapture';

export const ImageUploader = () => {
  const { status, originalImage, setStatus, setOriginalImage, setResult, setError, reset } = useOCRStore();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [engineDialogOpen, setEngineDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

  const processImage = useCallback(async (file: File, engine: OcrEngine) => {
    try {
      setStatus('uploading');
      setValidationError(null);
      
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
      
      setStatus('processing');

      const ocrResult = await createReceiptOnServer(file, engine);
      setResult(ocrResult);

      try {
        await createReceipt({
          folderId: null,
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
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    }
  }, [setStatus, setOriginalImage, setResult, setError]);

  const promptEngineAndProcess = useCallback((file: File) => {
    setPendingFile(file);
    setEngineDialogOpen(true);
  }, []);

  const handleEngineChoice = useCallback((engine: Extract<OcrEngine, 'easyocr' | 'vision'>) => {
    if (!pendingFile) return;
    const file = pendingFile;
    setEngineDialogOpen(false);
    setPendingFile(null);
    processImage(file, engine);
  }, [pendingFile, processImage]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    promptEngineAndProcess(file);
  }, [promptEngineAndProcess]);

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

  const handleCaptureInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    setValidationError(null);
    promptEngineAndProcess(file);
    e.target.value = '';
  };

  if (status === 'success' && originalImage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-xl overflow-hidden border border-border bg-card"
      >
        <img
          src={originalImage}
          alt="Uploaded receipt"
          className="w-full h-auto max-h-[300px] object-contain"
        />
        <Button
          variant="icon"
          size="icon"
          className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm"
          onClick={handleReset}
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
      <Dialog
        open={engineDialogOpen}
        onOpenChange={(open) => {
          setEngineDialogOpen(open);
          if (!open) {
            setPendingFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How do you want to scan this receipt?</DialogTitle>
            <DialogDescription>Choose the OCR engine to process the image.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row sm:justify-end sm:space-x-2">
            <Button type="button" onClick={() => handleEngineChoice('vision')}>
              Google Vision (IA)
            </Button>
            <Button type="button" variant="outline" onClick={() => handleEngineChoice('easyocr')}>
              EasyOCR (Local)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setEngineDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          onCapture={(file) => promptEngineAndProcess(file)}
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
