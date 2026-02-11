import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface ArtifactSlideProps {
  title: string;
  content: string;
  type: string;
  sourceUrl?: string;
  groupTitle?: string;
  importance?: number;
  startFrame: number;
  duration: number;
}

export function ArtifactSlide({
  title,
  content,
  type,
  sourceUrl,
  groupTitle,
  importance = 50,
  startFrame,
  duration,
}: ArtifactSlideProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  // Only render during this slide's time
  if (relativeFrame < 0 || relativeFrame >= duration) return null;

  // Entrance animation
  const titleOpacity = interpolate(relativeFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const contentOpacity = interpolate(relativeFrame, [10, 25], [0, 1], {
    extrapolateRight: "clamp",
  });

  const slideY = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 30, stiffness: 200 },
  });

  const translateY = interpolate(slideY, [0, 1], [40, 0]);

  // Exit animation
  const exitOpacity = interpolate(
    relativeFrame,
    [duration - 15, duration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isTitle = type === "title";
  const importanceColor =
    importance > 70 ? "#818cf8" : importance > 40 ? "#6366f1" : "#4f46e5";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px 120px",
        background: isTitle
          ? "linear-gradient(135deg, #0f0f1a 0%, #1a1a3e 100%)"
          : "linear-gradient(135deg, #0f0f1a 0%, #1e1e2e 100%)",
        opacity: exitOpacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Group tag */}
      {groupTitle && (
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 24,
            color: "#818cf8",
            fontWeight: 500,
            marginBottom: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {groupTitle}
        </div>
      )}

      {/* Type badge */}
      {!isTitle && (
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 18,
            color: importanceColor,
            fontWeight: 600,
            marginBottom: 12,
            padding: "4px 16px",
            border: `1px solid ${importanceColor}`,
            borderRadius: 20,
            letterSpacing: 1,
          }}
        >
          {type.replace("_", " ").toUpperCase()}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          fontSize: isTitle ? 72 : 52,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          maxWidth: "80%",
          lineHeight: 1.2,
          marginBottom: 32,
        }}
      >
        {title}
      </div>

      {/* Content */}
      <div
        style={{
          opacity: contentOpacity,
          fontSize: isTitle ? 28 : 24,
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: "70%",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 6,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {content}
      </div>

      {/* Source URL */}
      {sourceUrl && (
        <div
          style={{
            opacity: contentOpacity,
            position: "absolute",
            bottom: 60,
            fontSize: 18,
            color: "#6366f1",
          }}
        >
          {sourceUrl}
        </div>
      )}

      {/* Importance indicator */}
      {!isTitle && (
        <div
          style={{
            opacity: contentOpacity,
            position: "absolute",
            bottom: 60,
            right: 80,
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: `3px solid ${importanceColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            color: importanceColor,
          }}
        >
          {importance}
        </div>
      )}
    </div>
  );
}
