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
  url: string;
  pageCount: number;
  w: number;
  h: number;
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
    return { url: "", pageCount: 0, w: 600, h: 800 };
  }

  override canResize = () => true;

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
          // pointerEvents must be "all" so the scroll container inside
          // can receive wheel and pointer events.
          pointerEvents: "all",
        }}
      >
        <PdfViewer url={shape.props.url} containerWidth={shape.props.w} />
      </HTMLContainer>
    );
  }

  // Allow the shape to be moved by dragging its edges/border.
  // We stop pointer events inside the content area (PdfViewer) so that
  // scrolling works, but tldraw still needs to be able to drag the shape
  // when the user grabs it via the selection handles or border.
  override hideSelectionBoundsBg = () => false;

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
