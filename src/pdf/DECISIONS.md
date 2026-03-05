# Task 2 — PDF Rendering: Decision Notes

## Goal
Display a PDF document inside the tldraw canvas as a first-class, interactive shape.

---

## Key Decisions

### 1. `pdfjs-dist` as the renderer
**Choice:** Mozilla's `pdfjs-dist`  
**Why:** The de-facto standard for browser-based PDF rendering. Ships a dedicated web worker
that offloads all PDF parsing and decoding off the main thread — critical for keeping the
tldraw canvas responsive when loading large documents.

**Alternative considered:** `react-pdf` (a wrapper around pdfjs). Rejected because it adds
an abstraction layer that would make it harder to control worker lifecycle and canvas
rendering directly, which matters for performance optimisation.

---

### 2. Worker setup via `import.meta.url`
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
```
**Why:** Vite resolves `import.meta.url`-based URLs at build time and copies the worker file
into `/assets`. This is the correct, zero-config way to wire up workers in a Vite project.
No manual copying, no `public/` hacks.

---

### 3. Lazy page rendering via `IntersectionObserver`
**Choice:** Each `PdfPage` component defers its canvas render until it scrolls into view
(with a 200px lookahead margin).  
**Why:** A 100-page PDF would otherwise render 100 canvases immediately — hundreds of MB of
GPU texture memory and seconds of blocking work. Lazy rendering means we only pay for pages
the user actually sees.

**Implementation detail:** Once a page is rendered, we disconnect the observer — there's no
reason to re-render it.

---

### 4. HiDPI / Retina sharpness
```ts
const scale = width / viewport.width;
renderPageToCanvas(page, canvas, scale * (window.devicePixelRatio ?? 2));
```
**Why:** On retina screens `devicePixelRatio` is 2 (or 3). Rendering at that multiplied scale
and then constraining the canvas via CSS produces crisp text and lines instead of blurry ones.

---

### 5. `PdfShape` as a `BaseBoxShapeUtil`
**Why:** `BaseBoxShapeUtil` gives us free resizing handles, snapping, and proper bounding box
integration with tldraw's collision and selection system — with no extra code.

---

### 6. Object URL lifecycle
The PDF file is converted to an object URL (`URL.createObjectURL`) when the user picks it.
The URL lives as long as the shape does. In a production version we would:
- Revoke the URL on shape deletion (via `onBeforeDelete` lifecycle hook)
- Or persist the file in IndexedDB / object storage for cross-session durability

This is noted as a known limitation for the scope of this exercise.

---

## File Map

| File | Purpose |
|------|---------|
| `src/pdf/pdfWorker.ts` | One-time worker initialisation — import this before using pdfjs anywhere |
| `src/pdf/pdfUtils.ts` | Pure async helpers: `loadPdf`, `renderPageToCanvas`, `getPageDimensions` |
| `src/pdf/PdfPage.tsx` | Single-page canvas component with lazy rendering via IntersectionObserver |
| `src/pdf/PdfViewer.tsx` | Scrollable container that loads the doc and renders all PdfPage components |
| `src/shapes/pdf/PdfShapeUtil.tsx` | tldraw shape definition — wraps PdfViewer in an HTMLContainer |
| `src/components/PdfUploadButton.tsx` | Toolbar button — handles file pick, object URL creation, and shape placement |
