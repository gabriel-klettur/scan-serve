import { Calendar, DollarSign, HelpCircle, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OCRResponse } from "@/types/ocr";
import { getConfidenceColor, getConfidenceLabel } from "@/utils/image";

interface ReceiptAnalysisResultsProps {
  ocr: OCRResponse | null;
}

export const ReceiptAnalysisResults = ({ ocr }: ReceiptAnalysisResultsProps) => {
  if (!ocr) {
    return (
      <Card className="border-border/50">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No OCR results available.</div>
        </CardContent>
      </Card>
    );
  }

  const confidence = ocr.confidence_avg;
  const confidenceColor = getConfidenceColor(confidence);
  const confidenceLabel = getConfidenceLabel(confidence);

  const fields = [
    {
      icon: Store,
      label: "Merchant",
      value: ocr.fields.merchant,
      color: "text-primary",
    },
    {
      icon: Calendar,
      label: "Date",
      value: ocr.fields.date,
      color: "text-warning",
    },
    {
      icon: DollarSign,
      label: "Total",
      value: typeof ocr.fields.total === "number" ? ocr.fields.total.toFixed(2) : undefined,
      color: "text-success",
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="py-4">
        <CardTitle className="text-sm">Analysis Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 items-stretch lg:[grid-template-columns:1fr_1fr_1fr_2fr]">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border min-w-0"
            >
              <div className={`p-2 rounded-lg bg-card ${field.color}`}>
                <field.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                {field.value ? (
                  <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <HelpCircle className="w-3 h-3" />
                    <span className="text-xs">Not detected</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-lg bg-secondary/50 border border-border min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-sm font-semibold" style={{ color: confidenceColor }}>
                  {confidence.toFixed(1)}%
                </p>
              </div>

              <span
                className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
                style={{
                  borderColor: confidenceColor,
                  backgroundColor: `${confidenceColor}15`,
                  color: confidenceColor,
                }}
              >
                {confidenceLabel}
              </span>
            </div>

            <div className="mt-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${confidence}%`, backgroundColor: confidenceColor }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
