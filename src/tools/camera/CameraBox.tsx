import { useEditor, useValue } from "tldraw";
import { cameraBoxAtom } from "./CameraTool";

// CameraBox renders the live crop rectangle while the camera tool is dragging.
export function CameraBox() {
  const editor = useEditor();

  const screenBox = useValue(
    "camera-screen-box",
    () => {
      const box = cameraBoxAtom.get();
      if (!box || box.width === 0 || box.height === 0) return null;

      // Convert page coords - screen (viewport) coords so the overlay aligns with the canvas at any zoom level
      const tl = editor.pageToViewport({ x: box.x, y: box.y });
      const br = editor.pageToViewport({ x: box.x + box.w, y: box.y + box.h });

      return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    },
    [editor]
  );

  if (!screenBox) return null;

  const { x, y, w, h } = screenBox;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <mask id="camera-crop-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} fill="black" />
          </mask>
        </defs>

        {/* Dim everything outside the crop box */}
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.4)"
          mask="url(#camera-crop-mask)"
        />

        {/* Dashed crop border */}
        <rect
          x={x} y={y} width={w} height={h}
          fill="none"
          stroke="white"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />

        {/* Corner handles */}
        {([[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as [number, number][]).map(
          ([cx, cy], i) => (
            <rect key={i} x={cx - 4} y={cy - 4} width={8} height={8}
              fill="white" stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
          )
        )}
      </svg>

      {/* Live size label */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y + h + 6,
          background: "rgba(0,0,0,0.65)",
          color: "#fff",
          fontSize: 11,
          fontFamily: "monospace",
          padding: "2px 6px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        {Math.round(w)} × {Math.round(h)}
      </div>
    </div>
  );
}
