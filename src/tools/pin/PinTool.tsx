import {
  BindingOnShapeChangeOptions,
  BindingOnShapeDeleteOptions,
  BindingUtil,
  Box,
  RecordProps,
  Rectangle2d,
  ShapeUtil,
  StateNode,
  TLBinding,
  TLKeyboardEventInfo,
  TLPointerEventInfo,
  TLShape,
  TLShapeId,
  TLShapePartial,
  TLShapeUtilCanBindOpts,
  Vec,
  VecModel,
  createShapeId,
  invLerp,
  lerp,
} from "tldraw";

// ─── Constants ────────────────────────────────────────────────────────────────

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

export type PinShape = TLShape<typeof PIN_TYPE>;
export type PinBinding = TLBinding<typeof PIN_TYPE>;

// ─── PinShapeUtil ─────────────────────────────────────────────────────────────

export class PinShapeUtil extends ShapeUtil<PinShape> {
  static override type = PIN_TYPE;
  static override props: RecordProps<PinShape> = {};

  override getDefaultProps() {
    return {};
  }

  override canBind({ toShape, bindingType }: TLShapeUtilCanBindOpts<PinShape>) {
    if (!toShape) return false;
    if (bindingType === PIN_TYPE) return toShape.type !== PIN_TYPE;
    return true;
  }

  override canEdit() { return false; }
  override canResize() { return false; }
  override canSnap() { return false; }
  override hideRotateHandle() { return true; }
  override isAspectRatioLocked() { return true; }

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
    return (
      <rect width={PIN_WIDTH} height={PIN_HEIGHT} x={OFFSET_X} y={OFFSET_Y} rx={4} fill="none" />
    );
  }

  override onTranslateStart(shape: PinShape) {
    // Remove old bindings when dragging starts so pin can be freely moved
    const bindings = this.editor.getBindingsFromShape(shape, PIN_TYPE);
    this.editor.deleteBindings(bindings);
  }

  override onTranslateEnd(_initial: PinShape, pin: PinShape) {
    // Re-fetch from store — the passed argument may be a stale snapshot
    const freshPin = this.editor.getShape<PinShape>(pin.id);
    if (!freshPin) return;

    const pageAnchor = this.editor
      .getShapePageTransform(freshPin.id)
      .applyToPoint({ x: 0, y: 0 });

    const targets = this.editor
      .getShapesAtPoint(pageAnchor, { hitInside: true })
      .filter(
        (shape) =>
          this.editor.canBindShapes({
            fromShape: freshPin,
            toShape: shape,
            binding: PIN_TYPE,
          }) &&
          shape.parentId === freshPin.parentId &&
          shape.index < freshPin.index
      );

    for (const target of targets) {
      const targetBounds = Box.ZeroFix(
        this.editor.getShapeGeometry(target).bounds
      );
      const pointInTargetSpace = this.editor.getPointInShapeSpace(
        target,
        pageAnchor
      );

      const anchor = {
        x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
        y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
      };

      this.editor.createBinding({
        type: PIN_TYPE,
        fromId: freshPin.id,
        toId: target.id,
        props: { anchor },
      });
    }
  }
}

// ─── PinBindingUtil ───────────────────────────────────────────────────────────

export class PinBindingUtil extends BindingUtil<PinBinding> {
  static override type = PIN_TYPE;

  override getDefaultProps() {
    return { anchor: { x: 0.5, y: 0.5 } };
  }

  private changedToShapes = new Set<TLShapeId>();

  override onOperationComplete(): void {
    if (this.changedToShapes.size === 0) return;

    const fixedShapes = new Set(this.changedToShapes);
    const toCheck = [...this.changedToShapes];

    const initialPositions = new Map<TLShapeId, VecModel>();
    const targetDeltas = new Map<TLShapeId, Map<TLShapeId, VecModel>>();

    const addTargetDelta = (fromId: TLShapeId, toId: TLShapeId, delta: VecModel) => {
      if (!targetDeltas.has(fromId)) targetDeltas.set(fromId, new Map());
      targetDeltas.get(fromId)!.set(toId, delta);
      if (!targetDeltas.has(toId)) targetDeltas.set(toId, new Map());
      targetDeltas.get(toId)!.set(fromId, { x: -delta.x, y: -delta.y });
    };

    const allShapes = new Set<TLShapeId>();

    while (toCheck.length) {
      const shapeId = toCheck.pop()!;
      const shape = this.editor.getShape(shapeId);
      if (!shape || allShapes.has(shapeId)) continue;
      allShapes.add(shapeId);

      const bindings = this.editor.getBindingsToShape<PinBinding>(shape, PIN_TYPE);
      for (const binding of bindings) {
        if (allShapes.has(binding.fromId)) continue;
        allShapes.add(binding.fromId);

        const pin = this.editor.getShape<PinShape>(binding.fromId);
        if (!pin) continue;

        const pinPosition = this.editor
          .getShapePageTransform(pin.id)
          .applyToPoint({ x: 0, y: 0 });
        initialPositions.set(pin.id, pinPosition);

        for (const b of this.editor.getBindingsFromShape<PinBinding>(pin.id, PIN_TYPE)) {
          const shapeBounds = this.editor.getShapeGeometry(b.toId)!.bounds;
          const shapeAnchor = {
            x: lerp(shapeBounds.minX, shapeBounds.maxX, b.props.anchor.x),
            y: lerp(shapeBounds.minY, shapeBounds.maxY, b.props.anchor.y),
          };
          const currentPageAnchor = this.editor
            .getShapePageTransform(b.toId)
            .applyToPoint(shapeAnchor);
          const shapeOrigin = this.editor
            .getShapePageTransform(b.toId)
            .applyToPoint({ x: 0, y: 0 });

          initialPositions.set(b.toId, shapeOrigin);
          addTargetDelta(pin.id, b.toId, {
            x: currentPageAnchor.x - shapeOrigin.x,
            y: currentPageAnchor.y - shapeOrigin.y,
          });

          if (!allShapes.has(b.toId)) toCheck.push(b.toId);
        }
      }
    }

    const currentPositions = new Map(initialPositions);

    for (let i = 0; i < 30; i++) {
      const movements = new Map<TLShapeId, VecModel[]>();
      for (const [aId, deltas] of targetDeltas) {
        if (fixedShapes.has(aId)) continue;
        const aPosition = currentPositions.get(aId)!;
        for (const [bId, targetDelta] of deltas) {
          const bPosition = currentPositions.get(bId)!;
          const adjustmentDelta = {
            x: targetDelta.x - (aPosition.x - bPosition.x),
            y: targetDelta.y - (aPosition.y - bPosition.y),
          };
          if (!movements.has(aId)) movements.set(aId, []);
          movements.get(aId)!.push(adjustmentDelta);
        }
      }

      for (const [shapeId, deltas] of movements) {
        const currentPosition = currentPositions.get(shapeId)!;
        currentPositions.set(shapeId, Vec.Average(deltas).add(currentPosition));
      }
    }

    const updates: TLShapePartial[] = [];
    for (const [shapeId, position] of currentPositions) {
      const delta = Vec.Sub(position, initialPositions.get(shapeId)!);
      if (delta.len2() <= 0.01) continue;
      const newPosition = this.editor.getPointInParentSpace(shapeId, position);
      updates.push({
        ...this.editor.getShape(shapeId)!,
        id: shapeId,
        x: newPosition.x,
        y: newPosition.y,
      });
    }

    if (updates.length === 0) {
      this.changedToShapes.clear();
    } else {
      this.editor.updateShapes(updates);
    }
  }

  override onAfterChangeToShape({
    binding,
    shapeAfter,
  }: BindingOnShapeChangeOptions<PinBinding>): void {
    this.changedToShapes.add(binding.toId);
    const pin = this.editor.getShape(binding.fromId);
    if (!pin) return;
    if (pin.parentId !== shapeAfter.parentId) {
      this.editor.reparentShapes([pin.id], shapeAfter.parentId);
    }
  }

  override onBeforeDeleteToShape({
    binding,
  }: BindingOnShapeDeleteOptions<PinBinding>): void {
    this.editor.deleteShape(binding.fromId);
  }
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

  override onPointerUp(_info: TLPointerEventInfo) {
    const { currentPagePoint } = this.editor.inputs;
    const pinId = createShapeId();

    this.editor.markHistoryStoppingPoint();
    this.editor.createShape({
      id: pinId,
      type: PIN_TYPE,
      x: currentPagePoint.x,
      y: currentPagePoint.y,
    });

    // Bind immediately after creation — replaces the onTranslateEnd logic
    // since we're no longer using select.translating
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

    const allAtPoint = this.editor.getShapesAtPoint(pagePoint, { hitInside: true });

    const targets = allAtPoint.filter((shape) => {
        // Exclude the pin itself and other pins
        if (shape.id === pinId) return false;
        if (shape.type === PIN_TYPE) return false;
        // Only bind to shapes on the same page level
        if (shape.parentId !== pin.parentId) return false;
        return true;
      }
    );

    if (targets.length < 2) return;

    for (const target of targets) {
      const targetBounds = Box.ZeroFix(
        this.editor.getShapeGeometry(target).bounds
      );
      const pointInTargetSpace = this.editor.getPointInShapeSpace(
        target,
        pagePoint
      );

      const anchor = {
        x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
        y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
      };

      this.editor.createBinding({
        type: PIN_TYPE,
        fromId: pinId,
        toId: target.id,
        props: { anchor },
      });
    }
  }
}
