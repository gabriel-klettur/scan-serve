import { Scan } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BeforeAfterViewer } from '@/components/viewer/BeforeAfterViewer';
import { ConfidenceMeter } from '@/components/results/ConfidenceMeter';
import { OCRFields } from '@/components/results/OCRFields';
import { AiStageBar } from '@/components/results/AiStageBar';
import { OCRText } from '@/components/results/OCRText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useOCRStore } from '@/store/ocrStore';

const Results = () => {
  const { status, result } = useOCRStore();
  const hasResult = status === 'success' && result;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        {!hasResult && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">No results yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a receipt on the Home page to generate OCR results.
                </p>
                <div className="flex justify-end">
                  <Button asChild>
                    <Link to="/">Go to Home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {hasResult && (
          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
              <Card className="min-h-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" />
                    Scan Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 h-[60vh] min-h-[340px] sm:min-h-[420px] max-h-[760px]">
                  <BeforeAfterViewer />
                </CardContent>
              </Card>

              <Card className="min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg">Extracted Text</CardTitle>
                    <AiStageBar />
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 h-[60vh] min-h-[340px] sm:min-h-[420px] max-h-[760px]">
                  <OCRText />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 items-stretch lg:[grid-template-columns:1fr_1fr_1fr_2fr]">
                  <OCRFields layout="inline" />
                  <ConfidenceMeter layout="inline" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Results;
