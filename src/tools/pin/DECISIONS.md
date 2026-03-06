# Task 3 — Pin Tool: Decision Notes

## Goal
A custom tldraw tool that places a pin shape on the canvas. When the pin sits on top of
two or more overlapping shapes, those shapes become "attached" — moving one pulls the other.

---

## Key Decisions

### 1. Using tldraw's official Binding system
**Choice:** `BindingUtil` + `createBinding()` — tldraw's first-class API for shape relationships.  
**Why:** The assignment explicitly asks for "deep integration with the Editor API". Bindings
are the correct abstraction: they are persistent records in the store, survive undo/redo,
and expose lifecycle hooks (`onAfterChangeToShape`, `onBeforeDeleteToShape`) that let us
react to shape movement without polling or side effects.

**Alternative considered:** Storing attached shape IDs in the pin's own props and manually
syncing positions in `onTranslateEnd`. Rejected because it breaks on undo/redo and requires
us to replicate logic tldraw already handles via bindings.

---

### 2. Binding creation on `onTranslateEnd`
When the user drops a pin, `onTranslateEnd` fires. At that point we call
`editor.getShapesAtPoint(pinTip, { hitInside: true })` to find all shapes under the pin tip,
then create a `PinBinding` from the pin to each qualifying shape.

The binding stores a normalised `anchor` — the pin's position as a fraction of the target
shape's bounding box (0–1 on both axes). This means if the target shape is resized, the
anchor point scales correctly.

---

### 3. Spring-relaxation solver in `onOperationComplete`
**The problem:** When shape A is pinned to shape B via a pin, moving A should pull B (and
vice versa). But if B is also pinned to C, C should also move — forming a network.

**The solution:** `onOperationComplete` runs once per batch of operations. It:
1. Walks the full graph of pin-connected shapes
2. Runs 30 iterations of a spring-relaxation pass — each shape is nudged toward satisfying
   all its pin constraints simultaneously
3. Applies the resulting positions in a single `updateShapes` call

30 iterations converges fast enough for typical use (2–5 connected shapes) without
being perceptible as lag. This approach is directly modelled on tldraw's official pin
bindings example.

---

### 4. Deleting bindings on `onTranslateStart`
When the user starts dragging a pin, we delete its current bindings immediately so it can
be freely repositioned. New bindings are created when it's dropped (`onTranslateEnd`).
This gives the expected behaviour: dragging a pin "unpins" the shapes, dropping it
"re-pins" whatever is underneath.

---

### 5. Custom SVG pin visual
Instead of an emoji (as tldraw's own example uses), we render an SVG pin with a circle
head, needle, and a specular highlight. This looks more intentional and integrates better
with a document/canvas product context.

The pin tip (bottom of the needle) is at the shape origin `(0, 0)` via negative CSS offsets,
so the binding anchor aligns exactly with what the user perceives as "where the pin lands".

---

### 6. Keyboard shortcut
The pin tool is registered as `kbd: "p"` so users can press **P** to switch to it — 
consistent with tldraw's built-in tool shortcuts.

---

## File Map

| File | Purpose |
|------|---------|
| `src/tools/pin/PinTool.tsx` | All pin logic: `PinShapeUtil`, `PinBindingUtil`, `PinTool` state node |
| `src/App.tsx` | Registers shape utils, binding utils, tools, and toolbar overrides |
