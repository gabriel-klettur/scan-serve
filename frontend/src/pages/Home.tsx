import { motion } from 'framer-motion';
import { Scan, Github, Zap, Shield, FolderOpen } from 'lucide-react';
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
  const { status, result } = useOCRStore();

  const isProcessing = status === 'uploading' || status === 'processing';
  const hasResult = status === 'success' && result;

  return (
    <div className="min-h-screen bg-background">
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
              <Link to="/receipts">
                <FolderOpen className="w-4 h-4" />
                Receipts
              </Link>
            </Button>
            <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-warning" />
                Fast Processing
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-success" />
                Secure
              </span>
            </div>
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
                  message={status === 'uploading' ? 'Uploading image...' : 'Analyzing receipt...'}
                  submessage="This may take a few seconds"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Grid */}
        {!isProcessing && (
          <div className={`grid gap-6 ${hasResult ? 'lg:grid-cols-3' : 'max-w-2xl mx-auto'}`}>
            {/* Upload Section */}
            <motion.div
              layout
              className={hasResult ? 'lg:col-span-2' : ''}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" />
                    {hasResult ? 'Scan Result' : 'Upload Receipt'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
              </Card>
            </motion.div>

            {/* Results Sidebar */}
            {hasResult && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden lg:block space-y-6"
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extracted Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OCRText />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* Features Grid - Only show when idle */}
        {!hasResult && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16 grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              {
                icon: Zap,
                title: 'Instant Processing',
                description: 'Get results in seconds with our optimized AI engine',
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                description: 'Your images are processed securely and never stored',
              },
              {
                icon: Scan,
                title: 'High Accuracy',
                description: 'Advanced OCR with field extraction and confidence scores',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center p-6 rounded-xl bg-card/50 border border-border"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
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
