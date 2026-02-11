import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  Rectangle2d,
  TLOnResizeHandler,
  resizeBox,
} from "tldraw";

export type GroupFrameShape = TLBaseShape<
  "group_frame",
  {
    w: number;
    h: number;
    title: string;
    color: string;
  }
>;

export class GroupShapeUtil extends ShapeUtil<GroupFrameShape> {
  static override type = "group_frame" as const;

  getDefaultProps(): GroupFrameShape["props"] {
    return {
      w: 800,
      h: 600,
      title: "Group",
      color: "#3b82f6",
    };
  }

  getGeometry(shape: GroupFrameShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: GroupFrameShape) {
    const { w, h, title, color } = shape.props;

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `2px dashed ${color}40`,
            borderRadius: 12,
            background: `${color}08`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -1,
              left: 16,
              background: color,
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "0 0 6px 6px",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {title}
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: GroupFrameShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={12}
        ry={12}
      />
    );
  }

  override onResize: TLOnResizeHandler<GroupFrameShape> = (shape, info) => {
    return resizeBox(shape, info);
  };
}
