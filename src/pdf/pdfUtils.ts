import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

// Initialise the worker inline so this file is self-contained.
// Any file that imports from pdfUtils will automatically have the worker ready.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Suppress pdfjs font-substitution warnings — these fire when a PDF uses a
// system font (e.g. Arial Italic) that pdfjs can't find in the browser
// environment. pdfjs falls back to a built-in substitute automatically, so
// the warning is noise. All other console.warn calls pass through unchanged.
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].startsWith("Cannot load system font:")) return;
  _warn(...args);
};

/**
 * Load a PDF from a URL or ArrayBuffer and return the document proxy.
 * All heavy parsing happens inside the pdfjs web worker — never on the main thread.
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
 * @param scale   - Pixel-ratio-aware scale (default: devicePixelRatio for HiDPI sharpness)
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
