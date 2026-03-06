import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "@/pdf/pdfUtils";

interface PdfPageProps {
  page: PDFPageProxy;
  width: number; // logical width to fit the page into (in CSS px)
}

// PdfPage renders a single PDF page lazily. It starts rendering when it comes close to the viewport, and shows a placeholder before that.
export function PdfPage({ page, width }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  // Compute height from the page's natural aspect ratio
  const viewport = page.getViewport({ scale: 1 });
  const aspectRatio = viewport.height / viewport.width;
  const height = width * aspectRatio;

  // Observe visibility
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // render once, then stop observing
        }
      },
      { rootMargin: "200px" } // start rendering 200px before it enters the viewport
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Render once visible
  useEffect(() => {
    if (!isVisible || isRendered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = width / viewport.width;
    renderPageToCanvas(page, canvas, scale * (window.devicePixelRatio ?? 2))
      .then(() => setIsRendered(true))
      .catch(console.error);
  }, [isVisible, isRendered, page, viewport.width, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: "block",
        // Placeholder background while the page hasn't rendered yet
        background: isRendered ? "transparent" : "#f0f0f0",
      }}
    />
  );
}
