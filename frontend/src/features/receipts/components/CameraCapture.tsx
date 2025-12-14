import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CameraCaptureProps {
  disabled?: boolean;
  onCapture: (file: File) => void;
}

const CAPTURE_MIME_TYPE = "image/jpeg";

export const CameraCapture = ({ disabled, onCapture }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          facingMode: { ideal: "environment" },
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
      setError(e instanceof Error ? e.message : "Unable to access camera");
      stop();
    }
  }, [stop]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setError("Camera not ready yet");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture image");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, CAPTURE_MIME_TYPE, 0.92);
    });

    if (!blob) {
      setError("Unable to capture image");
      return;
    }

    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: CAPTURE_MIME_TYPE });
    onCapture(file);
  }, [onCapture]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            <span>Camera</span>
          </div>

          {!isActive ? (
            <Button type="button" variant="outline" onClick={start} disabled={disabled}>
              <Camera className="w-4 h-4" />
              Start
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={stop} disabled={disabled}>
              <RefreshCw className="w-4 h-4" />
              Stop
            </Button>
          )}
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="relative rounded-xl overflow-hidden border border-border bg-black/5">
          <video ref={videoRef} className="w-full h-auto max-h-[340px] object-contain" playsInline muted />
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleCapture} disabled={disabled || !isActive}>
            <Circle className="w-4 h-4" />
            Capture
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
