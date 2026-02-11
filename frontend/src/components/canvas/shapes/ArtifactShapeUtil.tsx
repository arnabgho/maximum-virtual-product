import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  Rectangle2d,
  TLOnResizeHandler,
  resizeBox,
} from "tldraw";
import { ArtifactCard } from "./ArtifactCard";

// Shape type definition
export type ArtifactShape = TLBaseShape<
  "artifact",
  {
    w: number;
    h: number;
    artifactId: string;
    title: string;
    summary: string;
    type: string;
    sourceUrl: string | null;
    importance: number;
    references: string[];
    phase: string;
    groupId: string | null;
    feedbackCount: number;
  }
>;

export class ArtifactShapeUtil extends ShapeUtil<ArtifactShape> {
  static override type = "artifact" as const;

  getDefaultProps(): ArtifactShape["props"] {
    return {
      w: 300,
      h: 200,
      artifactId: "",
      title: "",
      summary: "",
      type: "markdown",
      sourceUrl: null,
      importance: 50,
      references: [],
      phase: "research",
      groupId: null,
      feedbackCount: 0,
    };
  }

  getGeometry(shape: ArtifactShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: ArtifactShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <ArtifactCard
          artifactId={shape.props.artifactId}
          title={shape.props.title}
          summary={shape.props.summary}
          type={shape.props.type}
          sourceUrl={shape.props.sourceUrl}
          importance={shape.props.importance}
          references={shape.props.references}
          phase={shape.props.phase}
          feedbackCount={shape.props.feedbackCount}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: ArtifactShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        ry={8}
      />
    );
  }

  override onResize: TLOnResizeHandler<ArtifactShape> = (shape, info) => {
    return resizeBox(shape, info);
  };
}
