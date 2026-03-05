import {
  BaseBoxShapeUtil,
  HTMLContainer,
  type TLBaseShape,
  type RecordProps,
  T,
} from "tldraw";
import { PdfViewer } from "@/pdf/PdfViewer";

// ─── Shape type ────────────────────────────────────────────────────────────────

export type PdfShapeProps = {
  url: string;       // URL (or object URL) of the PDF to display
  pageCount: number; // cached so tldraw doesn't need to re-parse to know bounds
  w: number;         // logical width of the shape in canvas units
  h: number;         // logical height of the shape in canvas units
};

export type PdfShape = TLBaseShape<"pdf", PdfShapeProps>;

// ─── Shape util ────────────────────────────────────────────────────────────────

export class PdfShapeUtil extends BaseBoxShapeUtil<PdfShape> {
  static override type = "pdf" as const;

  static override props: RecordProps<PdfShape> = {
    url: T.string,
    pageCount: T.number,
    w: T.number,
    h: T.number,
  };

  override getDefaultProps(): PdfShapeProps {
    return {
      url: "",
      pageCount: 0,
      w: 600,
      h: 800,
    };
  }

  // Allow the shape to be resized by the user
  override canResize = () => true;

  // Render the HTML content of the shape
  override component(shape: PdfShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: "hidden",
          borderRadius: 4,
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          background: "#fff",
          pointerEvents: "all",
        }}
      >
        <PdfViewer url={shape.props.url} containerWidth={shape.props.w} />
      </HTMLContainer>
    );
  }

  // Minimal selection indicator — just an outline
  override indicator(shape: PdfShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={4}
        ry={4}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
      />
    );
  }
}
