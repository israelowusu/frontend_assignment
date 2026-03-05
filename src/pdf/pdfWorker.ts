import * as pdfjsLib from "pdfjs-dist";

// Point the worker at the bundled pdfjs worker file.
// Vite copies it to /assets at build time; in dev it's served from node_modules.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export { pdfjsLib };
