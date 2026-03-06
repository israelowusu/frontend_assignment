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

// Type declarations

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

// PinShapeUtil 

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

// PinBindingUtil

export class PinBindingUtil extends BindingUtil<PinBinding> {
  static override type = PIN_TYPE;

  override getDefaultProps() {
    return { anchor: { x: 0.5, y: 0.5 } };
  }

  override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<PinBinding>): void {
    this.editor.deleteShape(binding.fromId);
  }
}

// Pin side-effect registration 
//
// registerBeforeChangeHandler intercepts each record update before it is written to the store.

export function registerPinSideEffects(editor: Editor) {
  const processing = new Set<TLShapeId>();

  const unsub = editor.sideEffects.registerBeforeChangeHandler(
    "shape",
    (prev: TLUnknownShape, next: TLUnknownShape): TLUnknownShape => {
      // Skip shapes we are already adjusting to prevent re-entrancy
      if (processing.has(next.id)) return next;

      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (dx === 0 && dy === 0) return next;

      // Only act on shapes that have at least one pin binding
      const pinBindings = editor.getBindingsToShape<PinBinding>(next, PIN_TYPE);
      if (pinBindings.length === 0) return next;

      // Mark this shape so sibling callbacks skip it
      processing.add(next.id);

      try {
        for (const pb of pinBindings) {
          const pin = editor.getShape<PinShape>(pb.fromId);
          if (!pin || processing.has(pin.id)) continue;

          processing.add(pin.id);

          // Move the pin by the same delta as the shape it is bound to
          editor.store.put([{ ...pin, x: pin.x + dx, y: pin.y + dy }]);

          // Move all sibling shapes attached to this pin
          const siblings = editor
            .getBindingsFromShape<PinBinding>(pin, PIN_TYPE)
            .filter((b) => b.toId !== next.id);

          for (const sb of siblings) {
            const sib = editor.getShape(sb.toId);
            if (!sib || processing.has(sib.id)) continue;

            processing.add(sib.id);
            editor.store.put([{ ...sib, x: sib.x + dx, y: sib.y + dy }]);
          }
        }
      } finally {
        processing.clear();
      }

      return next;
    }
  );

  return unsub;
}

// PinTool
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
