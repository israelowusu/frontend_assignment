import { useEffect, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { loadPdf } from "@/pdf/pdfUtils";
import { PdfPage } from "@/pdf/PdfPage";

interface PdfViewerProps {
  url: string;
  containerWidth: number;
}

/**
 * PdfViewer is the scrollable container that shows all pages of a PDF.
 *
 * It loads the document once (keyed on url), extracts all page proxies,
 * and renders them stacked vertically. Each PdfPage handles its own
 * lazy rendering via IntersectionObserver.
 */
export function PdfViewer({ url, containerWidth }: PdfViewerProps) {
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadPdf(url)
      .then(async (doc: PDFDocumentProxy) => {
        if (cancelled) return;

        // Extract all page proxies upfront so we know total page count.
        // The actual pixel rendering is still deferred per-page.
        const pageProxies = await Promise.all(
          Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1))
        );

        if (!cancelled) {
          setPages(pageProxies);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div
        style={{
          width: containerWidth,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          fontSize: 14,
        }}
      >
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: containerWidth,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e53e3e",
          fontSize: 14,
          padding: 16,
          textAlign: "center",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        width: containerWidth,
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 8,
        boxSizing: "border-box",
        background: "#e5e7eb",
      }}
    >
      {pages.map((page, index) => (
        <PdfPage
          key={index}
          page={page}
          width={containerWidth - 16} // account for horizontal padding
        />
      ))}
    </div>
  );
}
