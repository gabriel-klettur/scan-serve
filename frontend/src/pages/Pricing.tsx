import { AppHeader } from "@/components/navigation/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

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
                <p>Optional WhatsApp/Telegram capture: send a photo and get structured results on your phone.</p>
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
