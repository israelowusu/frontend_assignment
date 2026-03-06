import {
  Box,
  StateNode,
  TLKeyboardEventInfo,
  atom,
} from "tldraw";

// Shared reactive atom
// Lives outside the class so CameraBox can import and subscribe to it directly.

export const cameraBoxAtom = atom<Box | null>("camera-box", null);

// Idle state

class CameraIdle extends StateNode {
  static override id = "idle";

  override onEnter() {
    cameraBoxAtom.set(null);
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

  override onPointerDown() {
    this.parent.transition("dragging");
  }
}

// Dragging state

export class CameraDragging extends StateNode {
  static override id = "dragging";

  override onEnter() {
    this.editor.setCursor({ type: "cross", rotation: 0 });
    const { x, y } = this.editor.inputs.currentPagePoint;
    cameraBoxAtom.set(new Box(x, y, 0, 0));
  }

  override onExit() {
    cameraBoxAtom.set(null);
  }

  override onPointerMove() {
    const origin = this.editor.inputs.originPagePoint;
    const current = this.editor.inputs.currentPagePoint;
    // Box.FromPoints handles all drag directions correctly
    cameraBoxAtom.set(Box.FromPoints([origin, current]));
  }

  override onPointerUp() {
    const box = cameraBoxAtom.get();
    cameraBoxAtom.set(null);

    if (!box || box.width < 4 || box.height < 4) {
      this.parent.transition("idle");
      return;
    }

    this.exportRegion(box);
    this.parent.transition("idle");
  }

  override onKeyDown(info: TLKeyboardEventInfo) {
    if (info.key === "Escape") {
      this.parent.transition("idle");
    }
  }

  private async exportRegion(box: Box) {
    // Find only shapes that intersect the crop box
    const shapeIds = this.editor
      .getCurrentPageShapes()
      .filter((shape) => {
        const shapeBounds = this.editor.getShapePageBounds(shape);
        return shapeBounds ? box.collides(shapeBounds) : false;
      })
      .map((s) => s.id);

    if (shapeIds.length === 0) return;

    // Let tldraw fit the selected shapes naturally
    const { blob } = await this.editor.toImage(shapeIds, {
      format: "png",
      background: true,
      padding: 0,
      scale: 2,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-export-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Camera tool root

export class CameraTool extends StateNode {
  static override id = "camera";
  static override initial = "idle";
  static override children = () => [CameraIdle, CameraDragging];

  override onExit() {
    cameraBoxAtom.set(null);
    this.editor.setCursor({ type: "default", rotation: 0 });
  }
}
