import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Circle, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CapturedImage {
  id: string;
  preview: string;
  file: File;
}

interface BatchCameraCaptureProps {
  disabled?: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
  capturedCount?: number;
}

const CAPTURE_MIME_TYPE = 'image/jpeg';

/**
 * Batch camera capture component for continuous photo taking.
 * Allows users to take multiple photos without interruption.
 */
export const BatchCameraCapture = ({
  disabled,
  onCapture,
  onClose,
  capturedCount = 0,
}: BatchCameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<CapturedImage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to access camera');
      stop();
    }
  }, [stop]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isCapturing) return;

    setIsCapturing(true);

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setError('Camera not ready yet');
      setIsCapturing(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Unable to capture image');
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, CAPTURE_MIME_TYPE, 0.92);
    });

    if (!blob) {
      setError('Unable to capture image');
      setIsCapturing(false);
      return;
    }

    const file = new File([blob], `receipt-${Date.now()}.jpg`, {
      type: CAPTURE_MIME_TYPE,
    });

    const preview = canvas.toDataURL(CAPTURE_MIME_TYPE, 0.5);

    setLastCapture({
      id: `capture-${Date.now()}`,
      preview,
      file,
    });

    onCapture(file);
    setIsCapturing(false);
  }, [isCapturing, onCapture]);

  // Auto-start camera on mount
  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isActive && !disabled) {
        e.preventDefault();
        handleCapture();
      }
      if (e.code === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, disabled, handleCapture, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative rounded-xl overflow-hidden border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Camera className="w-4 h-4 text-primary" />
          ) : (
            <CameraOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            Batch Camera Capture
          </span>
          {capturedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              {capturedCount} captured
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={start}
              disabled={disabled}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Retry
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative aspect-[4/3] bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted
        />

        {/* Capture Flash Effect */}
        <AnimatePresence>
          {isCapturing && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Last Capture Preview */}
        <AnimatePresence>
          {lastCapture && (
            <motion.div
              key={lastCapture.id}
              initial={{ opacity: 0, scale: 0.5, x: 20, y: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute bottom-3 right-3 w-20 h-28 rounded-lg overflow-hidden border-2 border-success shadow-lg"
            >
              <img
                src={lastCapture.preview}
                alt="Last capture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-success" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center p-4">
              <CameraOff className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Capture Guide Lines */}
        {isActive && (
          <div className="absolute inset-4 pointer-events-none">
            <div className="w-full h-full border-2 border-dashed border-white/20 rounded-lg" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[10px]">Space</kbd> or click to capture
          </p>
          <Button
            type="button"
            onClick={handleCapture}
            disabled={disabled || !isActive || isCapturing}
            className={cn(
              'gap-2 min-w-[120px]',
              isCapturing && 'animate-pulse'
            )}
          >
            <Circle className={cn('w-4 h-4', isCapturing && 'fill-current')} />
            {isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
