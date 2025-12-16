import { CreditCard, FolderOpen, Scan } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="relative border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Scan className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ReceiptVision</h1>
              <p className="text-xs text-muted-foreground">AI-Powered OCR</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Plans & Pricing</h2>
            <p className="text-muted-foreground">
              Choose the plan that fits your use case: educational testing, small business usage, or enterprise-grade reliability.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Free (Educational)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Partial extraction using a traditional method.</p>
                <p>Up to 10 AI uses per day (educational intent).</p>
                <p>Best for learning, prototypes, and students.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Base ($5)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Full receipt reading via Google OCR.</p>
                <p>$5 includes 500 scans.</p>
                <p>Additional monthly costs vary by receipt size (token usage).</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enterprise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>For restaurants, bars, hotels, and high-volume teams.</p>
                <p>Full reading + AI-assisted correction and validation flows.</p>
                <p>Target reliability: 95% (improving toward 95–100% depending on conditions).</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            <p>
              Note: “scan” means processing a receipt image through OCR. Variable costs depend on extracted text volume and AI token
              consumption.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
