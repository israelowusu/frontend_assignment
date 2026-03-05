import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { PdfShapeUtil } from "@/shapes/pdf/PdfShapeUtil";
import { PdfUploadButton } from "@/components/PdfUploadButton";

// Register our custom shape utils with tldraw
const customShapeUtils = [PdfShapeUtil];

export default function App() {
  return (
    <div className="h-screen w-screen">
      <Tldraw
        shapeUtils={customShapeUtils}
        components={{
          // Render our PDF upload button inside tldraw's top panel
          TopPanel: () => (
            <div style={{ padding: "8px 12px" }}>
              <PdfUploadButton />
            </div>
          ),
        }}
      />
    </div>
  );
}
