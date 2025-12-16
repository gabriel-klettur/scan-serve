import { motion } from 'framer-motion';
import { Scan, FolderOpen, CreditCard } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOCRStore } from '@/store/ocrStore';
import { ImageUploader } from '@/components/uploader/ImageUploader';
import { BeforeAfterViewer } from '@/components/viewer/BeforeAfterViewer';
import { OCRText } from '@/components/results/OCRText';
import { OCRFields } from '@/components/results/OCRFields';
import { ConfidenceMeter } from '@/components/results/ConfidenceMeter';
import { ExportActions } from '@/components/results/ExportActions';
import { Loader } from '@/components/ui/Loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Home = () => {
  const { status, result, queueStatus, queuePosition } = useOCRStore();

  const [topRowHeight, setTopRowHeight] = useState<number>(560);
  const [isResizing, setIsResizing] = useState(false);
  const resizeState = useRef<{ dragging: boolean; startY: number; startHeight: number }>({
    dragging: false,
    startY: 0,
    startHeight: 560,
  });

  const isProcessing = status === 'uploading' || status === 'processing';
  const hasResult = status === 'success' && result;

  const loaderMessage = (() => {
    if (status === 'uploading') return 'Uploading image...';
    if (queueStatus === 'queued') {
      if (typeof queuePosition === 'number' && queuePosition > 0) {
        return `Queued for OCR (position ${queuePosition})`;
      }
      return 'Queued for OCR...';
    }
    if (queueStatus === 'processing') return 'Processing OCR...';
    return 'Analyzing receipt...';
  })();

  const loaderSubmessage = (() => {
    if (queueStatus === 'queued') return 'Waiting for an OCR worker to become available';
    if (queueStatus === 'processing') return 'This may take a few seconds';
    return 'This may take a few seconds';
  })();

  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasResult) return;
    setIsResizing(true);
    resizeState.current = { dragging: true, startY: e.clientY, startHeight: topRowHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  };

  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current.dragging) return;
    const delta = e.clientY - resizeState.current.startY;
    setTopRowHeight(clamp(resizeState.current.startHeight + delta, 360, 1000));
  };

  const endResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeState.current.dragging) return;
    resizeState.current.dragging = false;
    setIsResizing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Scan className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ReceiptVision</h1>
              <p className="text-xs text-muted-foreground">AI-Powered OCR</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link to="/">
                <Scan className="w-4 h-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link to="/receipts">
                <FolderOpen className="w-4 h-4" />
                Receipts
              </Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link to="/pricing">
                <CreditCard className="w-4 h-4" />
                Pricing
              </Link>
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-8">
        {/* Hero Section - Only show when no result */}
        {!hasResult && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Extract Data from{' '}
              <span className="text-gradient">Receipts & Tickets</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload your receipt image and let our AI instantly extract text, amounts, dates, and merchant information with high accuracy.
            </p>
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center py-16"
          >
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <Loader
                  message={loaderMessage}
                  submessage={loaderSubmessage}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Grid */}
        {!isProcessing && (
          <div
            className={
              hasResult
                ? 'grid gap-6 lg:grid-cols-2 lg:items-stretch'
                : 'grid gap-6 max-w-2xl mx-auto'
            }
          >
            {/* Scan Result / Upload */}
            <motion.div
              layout={!isResizing}
              className={hasResult ? 'lg:order-1 min-h-0' : ''}
              style={hasResult ? { height: topRowHeight } : undefined}
            >
              <Card className={hasResult ? 'h-full flex flex-col relative' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" />
                    {hasResult ? 'Scan Result' : 'Upload Receipt'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={hasResult ? 'space-y-6 flex-1 min-h-0' : 'space-y-6'}>
                  {!hasResult && <ImageUploader />}
                  {hasResult && (
                    <>
                      <BeforeAfterViewer />
                      <div className="lg:hidden space-y-6">
                        <OCRFields />
                        <ConfidenceMeter />
                        <OCRText />
                        <ExportActions />
                      </div>
                    </>
                  )}
                </CardContent>

                {hasResult && (
                  <div
                    role="separator"
                    aria-label="Resize panels"
                    onPointerDown={startResize}
                    onPointerMove={onResizeMove}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    className="absolute bottom-3 right-3 h-4 w-4 cursor-nwse-resize rounded-sm border border-border bg-card/80 backdrop-blur"
                    style={{ touchAction: 'none' }}
                  />
                )}
              </Card>
            </motion.div>

            {/* Extracted Text (desktop) */}
            {hasResult && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden lg:block lg:order-2 min-h-0"
                style={{ height: topRowHeight }}
              >
                <Card className="h-full flex flex-col relative">
                  <CardHeader>
                    <CardTitle className="text-lg">Extracted Text</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0">
                    <OCRText />
                  </CardContent>

                  <div
                    role="separator"
                    aria-label="Resize panels"
                    onPointerDown={startResize}
                    onPointerMove={onResizeMove}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    className="absolute bottom-3 right-3 h-4 w-4 cursor-nwse-resize rounded-sm border border-border bg-card/80 backdrop-blur"
                    style={{ touchAction: 'none' }}
                  />
                </Card>
              </motion.div>
            )}

            {/* Analysis Results (desktop, below) */}
            {hasResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden lg:block lg:order-3 lg:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <OCRFields />
                    <ConfidenceMeter />
                    <ExportActions />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built for professional receipt & document processing</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
