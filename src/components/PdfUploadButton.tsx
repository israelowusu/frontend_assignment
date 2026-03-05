import { useEditor } from "tldraw";
import { loadPdf, getPageDimensions } from "@/pdf/pdfUtils";
import type { ChangeEvent } from "react";

/**
 * PdfUploadButton renders a toolbar button that lets the user pick a PDF file.
 * On selection it:
 *   1. Creates an object URL from the File
 *   2. Loads the first page to get natural dimensions
 *   3. Creates a PdfShape on the canvas centred in the current viewport
 */
export function PdfUploadButton() {
  const editor = useEditor();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const url = URL.createObjectURL(file);

    try {
      const doc = await loadPdf(url);
      const firstPage = await doc.getPage(1);
      const { width, height } = getPageDimensions(firstPage, 1);

      // Scale so the PDF is 600px wide by default
      const scale = 600 / width;
      const shapeW = 600;
      const shapeH = height * scale * doc.numPages + (doc.numPages - 1) * 8;

      // Place the shape at the centre of the current viewport
      const { x, y } = editor.getViewportPageCenter();

      editor.createShape({
        type: "pdf",
        x: x - shapeW / 2,
        y: y - shapeH / 2,
        props: {
          url,
          pageCount: doc.numPages,
          w: shapeW,
          h: Math.min(shapeH, 800), // cap initial height; user can resize
        },
      });
    } catch (err) {
      console.error("Failed to load PDF:", err);
    }

    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  return (
    <label
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
      }}
    >
      📄 Open PDF
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </label>
  );
}
