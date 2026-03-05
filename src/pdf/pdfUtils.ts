import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { pdfjsLib } from "./pdfWorker";

/**
 * Load a PDF from a URL or ArrayBuffer and return the document proxy.
 * The heavy parsing happens inside the pdfjs web worker — never on the main thread.
 */
export async function loadPdf(
  source: string | ArrayBuffer
): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(
    typeof source === "string" ? source : { data: source }
  );
  return loadingTask.promise;
}

/**
 * Render a single PDF page onto a provided <canvas> element.
 *
 * @param page    - The PDFPageProxy returned by doc.getPage(n)
 * @param canvas  - The target <canvas> DOM element
 * @param scale   - Device-pixel-ratio-aware scale (default 2 for sharpness on HiDPI screens)
 */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale = window.devicePixelRatio ?? 2
): Promise<void> {
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // CSS size stays at logical pixels so the canvas looks correct on screen
  canvas.style.width = `${viewport.width / scale}px`;
  canvas.style.height = `${viewport.height / scale}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context from canvas");

  await page.render({ canvasContext: ctx, viewport }).promise;
}

/**
 * Return the logical (CSS) dimensions of a page at a given scale.
 * Useful for computing the bounding box of the tldraw shape before rendering.
 */
export function getPageDimensions(
  page: PDFPageProxy,
  scale = 1
): { width: number; height: number } {
  const viewport = page.getViewport({ scale });
  return { width: viewport.width, height: viewport.height };
}
