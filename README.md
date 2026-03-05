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

- [x] Task 1 — Repo setup
- [ ] Task 2 — PDF rendering on canvas
- [ ] Task 3 — Pin tool
- [ ] Task 4 — Camera tool

---

## Decision Notes

### Task 1
- Chose `pnpm` over `npm`/`yarn` for its strict `node_modules` layout which prevents phantom dependency bugs.
- Used ESLint v9 flat config (`eslint.config.ts`) — the new standard, avoids legacy `.eslintrc` confusion.
- Tailwind v4 uses a Vite plugin instead of a PostCSS pipeline, which is simpler and faster.
- `@` path alias configured in both `vite.config.ts` and `tsconfig.json` for clean imports.
