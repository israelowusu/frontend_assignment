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
import { useState } from "react";
import type { Editor } from "tldraw";

import { PdfShapeUtil } from "@/shapes/pdf/PdfShapeUtil";
import { PinShapeUtil, PinBindingUtil, PinTool, registerPinSideEffects } from "@/tools/pin/PinTool";
import { CameraTool } from "@/tools/camera/CameraTool";
import { CameraBox } from "@/tools/camera/CameraBox";
import { PdfUploadButton } from "@/components/PdfUploadButton";

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
  InFrontOfTheCanvas: CameraBox,
};

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null);

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
          registerPinSideEffects(ed);
        }}
      />

      {/* PDF upload — sits outside Tldraw's pointer-capture zone */}
      {editor && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            pointerEvents: "all",
          }}
        >
          <PdfUploadButton editor={editor} />
        </div>
      )}
    </div>
  );
}
