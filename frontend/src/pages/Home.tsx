import { motion } from 'framer-motion';
import { Scan, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useOCRStore } from '@/store/ocrStore';
import { UploadModeSelector } from '@/components/uploader/UploadModeSelector';
import { Loader } from '@/components/ui/Loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UploadStatus } from '@/types/ocr';

const Home = () => {
  const { status, result, queueStatus, queuePosition, reset } = useOCRStore();
  const navigate = useNavigate();
  const prevStatusRef = useRef<UploadStatus>(status);

  const isProcessing = status === 'uploading' || status === 'processing';
  const hasResult = status === 'success' && result;

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== 'success' && status === 'success' && result) {
      navigate('/results');
    }
  }, [navigate, result, status]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <AppHeader />

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!isProcessing && (
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

        {/* Upload */}
        {!isProcessing && (
          <div className="grid gap-6 max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" />
                    Upload Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <UploadModeSelector />
                  {hasResult && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={reset} className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        New Scan
                      </Button>
                      <Button asChild>
                        <Link to="/results">View Results</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
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
