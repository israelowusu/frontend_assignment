import {
  BindingOnShapeDeleteOptions,
  BindingUtil,
  Box,
  RecordProps,
  Rectangle2d,
  ShapeUtil,
  StateNode,
  TLBaseBinding,
  TLBaseShape,
  TLKeyboardEventInfo,
  TLShapeId,
  TLShapeUtilCanBindOpts,
  TLUnknownShape,
  createBindingId,
  createShapeId,
  invLerp,
} from "tldraw";
import type { Editor, VecModel } from "tldraw";

export const PIN_TYPE = "pin" as const;

const PIN_WIDTH = 32;
const PIN_HEIGHT = 40;
const OFFSET_X = -PIN_WIDTH / 2;
const OFFSET_Y = -PIN_HEIGHT;

// ─── Type declarations ────────────────────────────────────────────────────────

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PIN_TYPE]: Record<string, never>;
  }
  export interface TLGlobalBindingPropsMap {
    [PIN_TYPE]: {
      anchor: VecModel;
    };
  }
}

// Use TLBaseShape/TLBaseBinding — TLShape and TLBinding are non-generic union types
export type PinShape = TLBaseShape<typeof PIN_TYPE, Record<string, never>>;
export type PinBinding = TLBaseBinding<typeof PIN_TYPE, { anchor: VecModel }>;

// ─── PinShapeUtil ─────────────────────────────────────────────────────────────

export class PinShapeUtil extends ShapeUtil<PinShape> {
  static override type = PIN_TYPE;
  static override props: RecordProps<PinShape> = {};

  override getDefaultProps() { return {}; }
  override canEdit() { return false; }
  override canResize() { return false; }
  override canSnap() { return false; }
  override hideRotateHandle() { return true; }
  override isAspectRatioLocked() { return true; }

  override canBind({ toShapeType, bindingType }: TLShapeUtilCanBindOpts<PinShape>) {
    if (bindingType === PIN_TYPE) return toShapeType !== PIN_TYPE;
    return true;
  }

  override getGeometry() {
    return new Rectangle2d({
      width: PIN_WIDTH,
      height: PIN_HEIGHT,
      x: OFFSET_X,
      y: OFFSET_Y,
      isFilled: true,
    });
  }

  override component() {
    return (
      <svg
        width={PIN_WIDTH}
        height={PIN_HEIGHT}
        viewBox="0 0 32 40"
        style={{ marginLeft: OFFSET_X, marginTop: OFFSET_Y, overflow: "visible" }}
      >
        <circle cx="16" cy="13" r="12" fill="#e53e3e" stroke="#fff" strokeWidth="2" />
        <line x1="16" y1="25" x2="16" y2="40" stroke="#c53030" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="11" cy="9" r="3.5" fill="rgba(255,255,255,0.35)" />
      </svg>
    );
  }

  override indicator() {
    return <rect width={PIN_WIDTH} height={PIN_HEIGHT} x={OFFSET_X} y={OFFSET_Y} rx={4} fill="none" />;
  }
}

// ─── PinBindingUtil ───────────────────────────────────────────────────────────

export class PinBindingUtil extends BindingUtil<PinBinding> {
  static override type = PIN_TYPE;

  override getDefaultProps() {
    return { anchor: { x: 0.5, y: 0.5 } };
  }

  override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<PinBinding>): void {
    this.editor.deleteShape(binding.fromId);
  }
}

// ─── Pin side-effect registration ─────────────────────────────────────────────
// Uses registerAfterChangeHandler('shape', ...) which runs AFTER the store flush,
// making it safe to call updateShapes without causing infinite loops.

export function registerPinSideEffects(editor: Editor) {
  // Phase 1: collect moves during the flush (no store writes allowed here)
  const pendingMoves = new Map<TLShapeId, { dx: number; dy: number }>();

  const unsubChange = editor.sideEffects.registerAfterChangeHandler(
    "shape",
    (prev: TLUnknownShape, next: TLUnknownShape) => {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (dx === 0 && dy === 0) return;

      // Only track shapes that have pin bindings
      const pinBindings = editor.getBindingsToShape<PinBinding>(next, PIN_TYPE);
      if (pinBindings.length === 0) return;

      const existing = pendingMoves.get(next.id);
      if (existing) {
        existing.dx += dx;
        existing.dy += dy;
      } else {
        pendingMoves.set(next.id, { dx, dy });
      }
    }
  );

  // Phase 2: apply moves after the entire operation batch settles
  const unsubComplete = editor.sideEffects.registerOperationCompleteHandler(() => {
    if (pendingMoves.size === 0) return;

    const moves = new Map(pendingMoves);
    pendingMoves.clear();

    const shapesToUpdate: { id: TLShapeId; type: string; x: number; y: number }[] = [];
    const seen = new Set<TLShapeId>();

    for (const [movedId, { dx, dy }] of moves) {
      const movedShape = editor.getShape(movedId);
      if (!movedShape) continue;

      const pinBindings = editor.getBindingsToShape<PinBinding>(movedShape, PIN_TYPE);
      for (const pb of pinBindings) {
        const pin = editor.getShape<PinShape>(pb.fromId);
        if (!pin || seen.has(pin.id)) continue;
        seen.add(pin.id);

        shapesToUpdate.push({ id: pin.id, type: PIN_TYPE, x: pin.x + dx, y: pin.y + dy });

        const siblings = editor
          .getBindingsFromShape<PinBinding>(pin, PIN_TYPE)
          .filter((b) => b.toId !== movedId);

        for (const sb of siblings) {
          if (seen.has(sb.toId)) continue;
          seen.add(sb.toId);
          const sib = editor.getShape(sb.toId);
          if (!sib) continue;
          shapesToUpdate.push({ id: sib.id, type: sib.type, x: sib.x + dx, y: sib.y + dy });
        }
      }
    }

    if (shapesToUpdate.length === 0) return;

    // Defer to the next animation frame so we are fully outside the store's
    // flushAtomicCallbacks loop. Any write attempted during that loop —
    // even with sideEffects disabled — increments the depth counter and
    // eventually throws. rAF runs after the current flush has completely
    // exited, making it safe to call updateShapes with no depth risk.
    requestAnimationFrame(() => {
      editor.updateShapes(shapesToUpdate);
    });
  });

  return () => {
    unsubChange();
    unsubComplete();
  };
}

// ─── PinTool ──────────────────────────────────────────────────────────────────

export class PinTool extends StateNode {
  static override id = PIN_TYPE;

  override onEnter() {
    this.editor.setCursor({ type: "cross", rotation: 0 });
  }

  override onExit() {
    this.editor.setCursor({ type: "default", rotation: 0 });
  }

  override onKeyDown(info: TLKeyboardEventInfo) {
    if (info.key === "Escape") {
      this.editor.setCurrentTool("select");
    }
  }

  override onPointerUp() {
    const { currentPagePoint } = this.editor.inputs;
    const pinId = createShapeId();

    this.editor.markHistoryStoppingPoint();
    this.editor.createShape({
      id: pinId,
      type: PIN_TYPE,
      x: currentPagePoint.x,
      y: currentPagePoint.y,
    });

    this.bindPinToShapesAtPoint(pinId, currentPagePoint);
    this.editor.setSelectedShapes([pinId]);
    this.editor.setCurrentTool("select");
  }

  private bindPinToShapesAtPoint(
    pinId: ReturnType<typeof createShapeId>,
    pagePoint: { x: number; y: number }
  ) {
    const pin = this.editor.getShape<PinShape>(pinId);
    if (!pin) return;

    const targets = this.editor
      .getShapesAtPoint(pagePoint, { hitInside: true })
      .filter(
        (shape) =>
          shape.id !== pinId &&
          shape.type !== PIN_TYPE &&
          shape.parentId === pin.parentId
      );

    if (targets.length < 2) return;

    for (const target of targets) {
      const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target).bounds);
      const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pagePoint);

      const anchor = {
        x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
        y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
      };

      this.editor.createBinding<PinBinding>({
        id: createBindingId(),
        type: PIN_TYPE,
        fromId: pinId,
        toId: target.id,
        props: { anchor },
      });
    }
  }
}
