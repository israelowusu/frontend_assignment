# Frontend Assignment

A canvas-based web app built on top of [tldraw](https://tldraw.dev), developed as part of a frontend engineering hiring exercise.

---

## Stack

| Concern          | Choice                          | Reasoning |
|------------------|---------------------------------|-----------|
| Framework        | Vite + React 19 + TypeScript    | Fast HMR, minimal overhead vs Next.js for a canvas-first app |
| Package Manager  | pnpm                            | Strict dependency resolution, disk-efficient, fast |
| Linting          | ESLint (flat config, v9)        | Single tool, TypeScript-aware, no Prettier conflicts |
| Styling          | Tailwind CSS v4                 | Utility-first, zero runtime, integrates cleanly via Vite plugin |
| Canvas           | tldraw v3                       | Required by the exercise; latest version with improved Editor API |
| PDF Rendering    | pdfjs-dist                      | De-facto standard, worker-based so it never blocks the main thread |

---

## Folder Structure

```
src/
├── assets/          # Static assets (sample PDFs, icons)
├── components/      # Shared UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility / helper functions
├── pdf/             # PDF loading & rendering logic (isolated module)
├── shapes/
│   ├── pin/         # Pin shape definition & renderer
│   └── camera/      # Camera shape definition & renderer
├── tools/
│   ├── pin/         # Pin tool (tldraw StateNode)
│   └── camera/      # Camera tool (tldraw StateNode)
├── App.tsx
├── main.tsx
└── index.css
```

> **Why separate `shapes/` and `tools/`?**
> tldraw treats *tools* (state machines that handle user input) and *shapes* (data + rendering) as separate concepts.
> Mirroring this in the folder structure makes each concern immediately locatable and independently testable.

---

## Getting Started

```bash
pnpm install
pnpm dev
```

---

## Tasks

- Task 1 — Repo setup
- Task 2 — PDF rendering on canvas
- Task 3 — Pin tool
- Task 4 — Camera tool

---

## Decision Notes

### Task 1 — Repo Setup
- Chose `pnpm` over `npm`/`yarn` for its strict `node_modules` layout which prevents phantom dependency bugs.
- Used ESLint v9 flat config (`eslint.config.ts`) — the new standard, avoids legacy `.eslintrc` confusion.
- Tailwind v4 uses a Vite plugin instead of a PostCSS pipeline, which is simpler and faster.
- `@` path alias configured in both `vite.config.ts` and `tsconfig.json` for clean imports.

### Task 2 — PDF Rendering
- **`pdfjs-dist` over `react-pdf`:** Avoids abstraction layer overhead; direct worker lifecycle control is critical for responsiveness.
- **Worker setup via `import.meta.url`:** Vite copies the worker into `/assets` at build time — zero-config, no manual hacks.
- **Lazy page rendering:** `IntersectionObserver` with 200px lookahead defers rendering until visible; prevents hundreds of MB of GPU memory waste on large documents.
- **HiDPI support:** Apply `window.devicePixelRatio` to render scale for crisp text on retina displays.
- **`BaseBoxShapeUtil` for `PdfShape`:** Inherits resizing, snapping, and collision detection automatically.
- **Object URL lifecycle:** Created on upload; in production should be revoked on shape deletion or persisted to IndexedDB.
- **Event interception fix:** Upload button calls `stopPropagation()` on `pointerdown` to bypass tldraw's capturing listener.

### Task 3 — Pin Tool
- **tldraw's official Binding system:** Persisted relationships that survive undo/redo; exposes lifecycle hooks; avoids replicated manual sync logic.
- **Binding creation on `onTranslateEnd`:** Queries `editor.getShapesAtPoint()` under the pin tip; stores normalised anchor (0–1) so resizing scales attachment correctly.
- **Spring-relaxation solver:** `onOperationComplete` walks the pin graph and converges all shapes' positions over 30 iterations; fast enough for typical multi-shape networks.
- **Delete bindings on drag start:** User can freely reposition a pin; new bindings form on drop. Gives intuitive "unpin, drag, re-pin" workflow.
- **Custom SVG pin visual:** More intentional than emoji; pin tip at origin `(0, 0)` so anchor aligns with visual perception.
- **Keyboard shortcut `p`:** Consistent with tldraw's built-in tools.

### Task 4 — Camera Tool
- **Child states `Idle` + `Dragging`:** Mirrors tldraw's state machine pattern; each phase handles only its relevant events; explicit transitions.
- **`editor.toImage()` API:** Uses current v3.8+ API (not deprecated `exportToBlob`); accepts `bounds` parameter for crop region; `scale: 2` for retina output.
- **`Box.FromPoints([origin, current])`:** Handles all four drag directions correctly via min/max computation instead of simple subtraction.
- **`InFrontOfTheCanvas` overlay:** Sits above shapes, below UI chrome; DOM element so not included in exported image; provides visual feedback.
- **SVG mask for dimming:** Professional crop UX technique (Figma, Photoshop style); dims everything outside the region.
- **`useValue` for reactivity:** Subscribes to signal updates; overlay re-paints only when crop box changes, no full React re-renders.
- **`editor.pageToScreen(box)` for positioning:** Correctly aligns DOM overlay with canvas at any zoom/pan level.
- **Download via `<a download>`:** Standard cross-browser pattern; create object URL, trigger click, revoke immediately.
