import { useRef } from "react";
import type { Editor } from "tldraw";
import { loadPdf, getPageDimensions } from "@/pdf/pdfUtils";
import type { ChangeEvent, PointerEvent } from "react";

interface PdfUploadButtonProps {
  editor: Editor;
}

/**
 * PdfUploadButton — opens a native file picker and places the PDF as a
 * tldraw shape centred in the current viewport.
 *
 * WHY onPointerDown + stopPropagation:
 * tldraw installs a capturing pointer-event listener on its container that
 * intercepts ALL pointer events to manage tool state. This swallows the click
 * before it can trigger the native file dialog on a <label> or <button>.
 * Calling stopPropagation on pointerDown prevents tldraw from seeing the event
 * so the browser can handle it normally and open the file picker.
 */
export function PdfUploadButton({ editor }: PdfUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    // Stop tldraw's capturing listener from swallowing this event
    e.stopPropagation();
  }

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const url = URL.createObjectURL(file);

    try {
      const doc = await loadPdf(url);
      const firstPage = await doc.getPage(1);
      const { width, height } = getPageDimensions(firstPage, 1);

      const scale = 600 / width;
      const shapeW = 600;
      const shapeH = height * scale * doc.numPages + (doc.numPages - 1) * 8;

      const { x, y } = editor.getViewportPageCenter();

      editor.createShape({
        type: "pdf",
        x: x - shapeW / 2,
        y: y - shapeH / 2,
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
    <>
      {/* Hidden file input — triggered programmatically */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "#374151",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        📄 Open PDF
      </button>
    </>
  );
}
