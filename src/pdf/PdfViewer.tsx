import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { loadPdf } from "@/pdf/pdfUtils";
import { PdfPage } from "@/pdf/PdfPage";

interface PdfViewerProps {
  url: string;
  containerWidth: number;
}

// PdfViewer — scrollable multi-page PDF viewer inside a tldraw HTMLContainer.
export function PdfViewer({ url, containerWidth }: PdfViewerProps) {
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadPdf(url)
      .then(async (doc: PDFDocumentProxy) => {
        if (cancelled) return;
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

    return () => { cancelled = true; };
  }, [url]);

  // Intercept wheel events before tldraw's capturing listener sees them.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [pages]); // re-attach after pages load so ref is populated

  if (loading) {
    return (
      <div style={{
        width: containerWidth, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#888", fontSize: 14,
      }}>
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: containerWidth, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#e53e3e", fontSize: 14, padding: 16, textAlign: "center",
      }}>
        {error}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        width: containerWidth,
        height: "100%",
        overflowY: "scroll",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 8,
        boxSizing: "border-box",
        background: "#e5e7eb",
        // Prevent tldraw from treating this as a drag target when the user clicks inside the PDF
        cursor: "default",
      }}
      // tldraw needs to see pointer events to select the shape so that Delete/Backspace can remove it.
    >
      {pages.map((page, index) => (
        <PdfPage
          key={index}
          page={page}
          width={containerWidth - 16}
        />
      ))}
    </div>
  );
}
