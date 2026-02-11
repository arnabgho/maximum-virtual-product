import {
  ShapeUtil,
  HTMLContainer,
  Rectangle2d,
  T,
  resizeBox,
} from "tldraw";
import { ArtifactCard } from "./ArtifactCard";

/** @public */
export class ArtifactShapeUtil extends ShapeUtil<any> {
  static override type = "artifact" as const;

  static override props = {
    w: T.number,
    h: T.number,
    artifactId: T.string,
    title: T.string,
    summary: T.string,
    artifactType: T.string,
    sourceUrl: T.string,
    importance: T.number,
    references: T.arrayOf(T.string),
    phase: T.string,
    groupId: T.string,
    feedbackCount: T.number,
  };

  getDefaultProps() {
    return {
      w: 300,
      h: 200,
      artifactId: "",
      title: "",
      summary: "",
      artifactType: "markdown",
      sourceUrl: "",
      importance: 50,
      references: [],
      phase: "research",
      groupId: "",
      feedbackCount: 0,
    };
  }

  getGeometry(shape: any) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override onResize(shape: any, info: any) {
    return resizeBox(shape, info);
  }

  component(shape: any) {
    const p = shape.props;
    return (
      <HTMLContainer
        style={{
          width: p.w,
          height: p.h,
          pointerEvents: "all",
        }}
      >
        <ArtifactCard
          artifactId={p.artifactId}
          title={p.title}
          summary={p.summary}
          type={p.artifactType}
          sourceUrl={p.sourceUrl || null}
          importance={p.importance}
          references={p.references}
          phase={p.phase}
          feedbackCount={p.feedbackCount}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: any) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        ry={8}
      />
    );
  }
}
