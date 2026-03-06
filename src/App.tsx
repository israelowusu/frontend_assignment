import {
  DefaultToolbar,
  DefaultToolbarContent,
  Tldraw,
  TLComponents,
  TLUiAssetUrlOverrides,
  TLUiOverrides,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
} from "tldraw";
import "tldraw/tldraw.css";
import { useRef, useState } from "react";
import type { Editor } from "tldraw";
import type { ChangeEvent } from "react";

import { PdfShapeUtil } from "@/shapes/pdf/PdfShapeUtil";
import { PinShapeUtil, PinBindingUtil, PinTool } from "@/tools/pin/PinTool";
import { CameraTool } from "@/tools/camera/CameraTool";
import { CameraBox } from "@/tools/camera/CameraBox";
import { loadPdf, getPageDimensions } from "@/pdf/pdfUtils";

// ─── Registration ─────────────────────────────────────────────────────────────

const customShapeUtils = [PdfShapeUtil, PinShapeUtil];
const customBindingUtils = [PinBindingUtil];
const customTools = [PinTool, CameraTool];

// ─── Asset URLs ───────────────────────────────────────────────────────────────

const customAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "pin-icon": "/pin-icon.svg",
    "camera-icon": "/camera-icon.svg",
  },
};

// ─── UI overrides ─────────────────────────────────────────────────────────────

const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools["pin"] = {
      id: "pin",
      label: "Pin",
      icon: "pin-icon",
      kbd: "p",
      onSelect: () => editor.setCurrentTool("pin"),
    };
    tools["camera"] = {
      id: "camera",
      label: "Camera",
      icon: "camera-icon",
      kbd: "c",
      onSelect: () => editor.setCurrentTool("camera"),
    };
    return tools;
  },
};

// ─── Custom toolbar ───────────────────────────────────────────────────────────

function CustomToolbar() {
  const tools = useTools();
  const isPinSelected = useIsToolSelected(tools["pin"]);
  const isCameraSelected = useIsToolSelected(tools["camera"]);
  return (
    <DefaultToolbar>
      <TldrawUiMenuItem {...tools["pin"]} isSelected={isPinSelected} />
      <TldrawUiMenuItem {...tools["camera"]} isSelected={isCameraSelected} />
      <DefaultToolbarContent />
    </DefaultToolbar>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

const uiComponents: TLComponents = {
  Toolbar: CustomToolbar,
  // Render the crop box overlay in front of the canvas while camera tool drags
  InFrontOfTheCanvas: CameraBox,
};

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = URL.createObjectURL(file);

    try {
      const doc = await loadPdf(url);
      const firstPage = await doc.getPage(1);
      const { width, height } = getPageDimensions(firstPage, 1);

      const scale = 600 / width;
      const shapeW = 600;
      const shapeH = height * scale * doc.numPages + (doc.numPages - 1) * 8;

      const bounds = editor.getViewportPageBounds();
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;

      editor.createShape({
        type: "pdf",
        x: cx - shapeW / 2,
        y: cy - Math.min(shapeH, 800) / 2,
        props: {
          url,
          pageCount: doc.numPages,
          w: shapeW,
          h: Math.min(shapeH, 800),
        },
      });
    } catch (err) {
      console.error("Failed to load PDF:", err);
    }

    e.target.value = "";
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Tldraw
        shapeUtils={customShapeUtils}
        bindingUtils={customBindingUtils}
        tools={customTools}
        overrides={uiOverrides}
        components={uiComponents}
        assetUrls={customAssetUrls}
        onMount={(ed) => {
          setEditor(ed);
          (window as any).editor = ed;
        }}
      />

      {/* PDF upload — sibling of Tldraw, outside its pointer-capture zone */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          pointerEvents: "all",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          📄 Open PDF
        </button>
      </div>
    </div>
  );
}
