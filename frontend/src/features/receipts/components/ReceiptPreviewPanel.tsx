import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image, Scan } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { BoundingBox } from "@/types/ocr";
import type { Receipt } from "../types/receipt";
import { useObjectUrl } from "../utils/objectUrl";
import { ReceiptAnalysisResults } from "./ReceiptAnalysisResults";

interface ReceiptPreviewPanelProps {
  receipt: Receipt;
}

const getRectFromBbox = (bbox: number[][]) => {
  const xs = bbox.map((p) => p[0]);
  const ys = bbox.map((p) => p[1]);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  const y1 = Math.min(...ys);
  const y2 = Math.max(...ys);
  return { x1, y1, x2, y2 };
};

export const ReceiptPreviewPanel = ({ receipt }: ReceiptPreviewPanelProps) => {
  const imageUrl = useObjectUrl(receipt.imageBlob);

  const processedUrl = receipt.ocr?.processed_image_url ?? null;
  const boxes: BoundingBox[] = receipt.ocr?.boxes ?? [];

  const processedImgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);

  const formattedMarkdown = useMemo(() => {
    if (!receipt.ocr?.text_raw) return null;

    const lines = receipt.ocr.text_raw.split("\n").filter((l) => l.trim());
    return lines;
  }, [receipt.ocr?.text_raw]);

  const createdDate = useMemo(
    () => new Date(receipt.createdAt).toLocaleString(),
    [receipt.createdAt]
  );

  const scale = useMemo(() => {
    if (naturalSize.width <= 0 || naturalSize.height <= 0) return { x: 1, y: 1 };
    if (renderedSize.width <= 0 || renderedSize.height <= 0) return { x: 1, y: 1 };
    return {
      x: renderedSize.width / naturalSize.width,
      y: renderedSize.height / naturalSize.height,
    };
  }, [naturalSize, renderedSize]);

  useEffect(() => {
    const img = processedImgRef.current;
    if (!img) return;

    const updateRendered = () => {
      setRenderedSize({ width: img.clientWidth, height: img.clientHeight });
    };

    updateRendered();

    const ro = new ResizeObserver(() => updateRendered());
    ro.observe(img);
    return () => ro.disconnect();
  }, [processedUrl, receipt.id]);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="min-w-0">
          <h2 className="text-sm font-medium truncate">{receipt.originalFileName}</h2>
          <p className="text-xs text-muted-foreground">{createdDate}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {/* 3-column preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        {/* Column 1: Original Image */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
            <Image className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Original
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={receipt.originalFileName}
                  className="w-full h-auto rounded-lg border border-border/50 shadow-sm"
                />
              ) : (
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 2: Processed/Scan */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
            <Scan className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Scanned
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {processedUrl || imageUrl ? (
                <div className="relative rounded-lg border border-border/50 shadow-sm overflow-hidden bg-card">
                  <img
                    ref={processedImgRef}
                    src={processedUrl ?? imageUrl ?? undefined}
                    alt={`Processed ${receipt.originalFileName}`}
                    className="w-full h-auto block"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                      setRenderedSize({ width: img.clientWidth, height: img.clientHeight });
                    }}
                  />

                  {boxes.length > 0 && renderedSize.width > 0 && renderedSize.height > 0 ? (
                    <div className="absolute inset-0">
                      {boxes.map((box, index) => {
                        const { x1, y1, x2, y2 } = getRectFromBbox(box.bbox);
                        const left = x1 * scale.x;
                        const top = y1 * scale.y;
                        const width = (x2 - x1) * scale.x;
                        const height = (y2 - y1) * scale.y;
                        const isPinnedSelected = selectedBoxIndex === index;
                        const isHovered = hoveredBoxIndex === index;
                        const isActive = isPinnedSelected || (selectedBoxIndex === null && isHovered);

                        return (
                          <div
                            key={index}
                            className={cn(
                              "absolute cursor-pointer transition-all duration-150",
                              "border-2 rounded-sm",
                              isActive && "ring-2 ring-offset-2 ring-offset-background"
                            )}
                            style={{
                              left,
                              top,
                              width,
                              height,
                              borderColor: "#22c55e",
                              backgroundColor: isPinnedSelected ? "rgba(34,197,94,0.10)" : "transparent",
                              // @ts-expect-error ring color handled via CSS
                              "--tw-ring-color": "#22c55e",
                            }}
                            onClick={() =>
                              setSelectedBoxIndex(isPinnedSelected ? null : index)
                            }
                            onMouseEnter={() => setHoveredBoxIndex(index)}
                            onMouseLeave={() => setHoveredBoxIndex(null)}
                            title={box.text}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                  <Scan className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 3: Extracted Text (Markdown Preview) */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Extracted Text
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {formattedMarkdown && formattedMarkdown.length > 0 ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
                    <div className="font-mono text-xs leading-relaxed space-y-1">
                      {formattedMarkdown.map((line, idx) => (
                        <p
                          key={idx}
                          className={cn(
                            "m-0 py-0.5",
                            line.match(/^[A-Z\s]{3,}$/) &&
                              "font-semibold text-foreground",
                            line.match(/^\d+[.,]\d{2}/) &&
                              "text-emerald-600 dark:text-emerald-400",
                            line.match(/total|subtotal|tax|iva/i) &&
                              "font-medium text-primary"
                          )}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No text extracted yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Process this receipt to extract text
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        </div>

        {/* Analysis Results */}
        <div className="p-4 border-t border-border/50 bg-background">
          <ReceiptAnalysisResults ocr={receipt.ocr} />
        </div>
      </div>
    </div>
  );
};
