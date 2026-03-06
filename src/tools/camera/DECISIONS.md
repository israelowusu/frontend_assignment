# Task 4 — Camera Tool: Decision Notes

## Goal
A custom tldraw tool that lets the user drag a crop region on the canvas,
then exports that exact region as a downloaded PNG image.

---

## Key Decisions

### 1. Child states: `Idle` + `Dragging`
**Why:** The camera tool has two distinct behaviours — waiting for a drag to start (Idle)
and actively tracking a drag (Dragging). tldraw's state machine is designed for exactly
this: a parent tool (`CameraTool`) with child states that handle different phases.

This is the same pattern used by tldraw's own built-in screenshot tool. Using child states
means each state only handles the events it cares about, and transitions are explicit and
traceable.

---

### 2. `editor.toImage()` instead of `exportToBlob()`
**Why:** `exportToBlob` is deprecated in tldraw v3.8+. `editor.toImage()` is the current
API — it accepts a `bounds` parameter (a `Box`) which maps directly to our crop region in
page coordinates. We pass `scale: 2` for retina-quality output.

---

### 3. `Box.FromPoints([origin, current])` for the drag box
**Why:** Naively computing `width = current.x - origin.x` breaks when the user drags
left or upward (producing negative dimensions). `Box.FromPoints` handles all four drag
directions correctly by computing min/max across both points.

---

### 4. `InFrontOfTheCanvas` for the crop overlay
**Why:** tldraw provides a `InFrontOfTheCanvas` component slot specifically for overlays
that need to sit above shapes but below UI chrome. Rendering the crop box here avoids
z-index hacks and keeps it out of the exported image (since it's a DOM overlay, not
a canvas shape).

The overlay uses an SVG mask to dim everything outside the crop region — the same
technique used by professional crop UIs (Figma, Photoshop). This gives immediate visual
feedback about what will be exported.

---

### 5. `useValue` for reactive overlay updates
**Why:** `useValue` from tldraw subscribes to reactive signals. We use it to read
`dragging.box` on every pointer move without triggering full React re-renders. The
overlay only re-paints when the box actually changes.

---

### 6. `editor.pageToScreen(box)` for overlay positioning
**Why:** The drag box is in page coordinates (the canvas coordinate system). The overlay
is a DOM element in screen coordinates. `pageToScreen` handles zoom and pan correctly,
so the crop rectangle always aligns perfectly with the canvas at any zoom level.

---

### 7. Download via `<a download>`
**Why:** The simplest cross-browser way to trigger a file download from a Blob URL.
We create an object URL, click it programmatically, then immediately revoke it to
avoid memory leaks.

---

## File Map

| File | Purpose |
|------|---------|
| `src/tools/camera/CameraTool.ts` | `CameraIdle`, `CameraDragging`, `CameraTool` state nodes |
| `src/tools/camera/CameraBox.tsx` | SVG crop overlay rendered via `InFrontOfTheCanvas` |
| `public/camera-icon.svg` | Toolbar icon for the camera tool |
| `src/App.tsx` | Registers tool, binding, asset URL, and `InFrontOfTheCanvas` component |
