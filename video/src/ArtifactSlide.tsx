import { useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import { MermaidDiagram } from "./MermaidDiagram";

interface ArtifactSlideProps {
  title: string;
  content: string;
  summary?: string;
  type: string;
  sourceUrl?: string;
  groupTitle?: string;
  importance?: number;
  imageUrl?: string | null;
  breadcrumbs?: string[];
  startFrame: number;
  duration: number;
}

export function ArtifactSlide({
  title,
  content,
  summary,
  type,
  sourceUrl,
  groupTitle,
  importance = 50,
  imageUrl,
  breadcrumbs = [],
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
  const isMermaid = type === "mermaid";
  const importanceColor =
    importance > 70 ? "#818cf8" : importance > 40 ? "#6366f1" : "#4f46e5";
  const hasImage = imageUrl && !isTitle && !isMermaid;
  const displayText = isMermaid ? (summary || "") : (summary || content);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: hasImage ? "row" : "column",
        justifyContent: hasImage ? "flex-start" : "center",
        alignItems: "center",
        padding: "80px 120px",
        background: isTitle
          ? "linear-gradient(135deg, #0f0f1a 0%, #1a1a3e 100%)"
          : "linear-gradient(135deg, #0f0f1a 0%, #1e1e2e 100%)",
        opacity: exitOpacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Text content side */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: hasImage ? "flex-start" : isMermaid ? "center" : "center",
          flex: hasImage ? "1 1 55%" : "1",
          maxWidth: hasImage ? "55%" : "100%",
        }}
      >
        {/* Breadcrumbs — "Builds on" pills */}
        {breadcrumbs.length > 0 && !isTitle && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <span
              style={{
                opacity: interpolate(relativeFrame, [0, 10], [0, 1], {
                  extrapolateRight: "clamp",
                }),
                fontSize: 18,
                color: "#6b7280",
                fontWeight: 500,
              }}
            >
              Builds on:
            </span>
            {breadcrumbs.map((bc, i) => (
              <span
                key={i}
                style={{
                  opacity: interpolate(
                    relativeFrame,
                    [3 + i * 3, 10 + i * 3],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  ),
                  fontSize: 16,
                  color: "#a78bfa",
                  background: "#a78bfa20",
                  padding: "4px 12px",
                  borderRadius: 16,
                  border: "1px solid #a78bfa40",
                }}
              >
                {bc}
              </span>
            ))}
          </div>
        )}

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
            fontSize: isTitle ? 72 : isMermaid ? 40 : 52,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: hasImage ? "left" : "center",
            maxWidth: "100%",
            lineHeight: 1.2,
            marginBottom: isMermaid ? 12 : 32,
          }}
        >
          {title}
        </div>

        {/* Summary subtitle for mermaid slides */}
        {isMermaid && displayText && (
          <div
            style={{
              opacity: contentOpacity,
              fontSize: 20,
              color: "#a1a1aa",
              textAlign: "center",
              maxWidth: "100%",
              lineHeight: 1.4,
              marginBottom: 24,
            }}
          >
            {displayText}
          </div>
        )}

        {/* Mermaid diagram — full width */}
        {isMermaid && (
          <div style={{ width: "100%", maxHeight: 550, overflow: "hidden" }}>
            <MermaidDiagram
              content={content}
              startFrame={startFrame}
              duration={duration}
            />
          </div>
        )}

        {/* Content (non-mermaid) */}
        {!isMermaid && (
          <div
            style={{
              opacity: contentOpacity,
              fontSize: isTitle ? 28 : 24,
              color: "#a1a1aa",
              textAlign: hasImage ? "left" : "center",
              maxWidth: "100%",
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayText}
          </div>
        )}

        {/* Source URL */}
        {sourceUrl && (
          <div
            style={{
              opacity: contentOpacity,
              marginTop: 24,
              fontSize: 18,
              color: "#6366f1",
            }}
          >
            {sourceUrl}
          </div>
        )}
      </div>

      {/* Image side */}
      {hasImage && (
        <div
          style={{
            flex: "1 1 40%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginLeft: 60,
            opacity: contentOpacity,
          }}
        >
          <Img
            src={imageUrl}
            style={{
              maxWidth: "100%",
              maxHeight: 700,
              borderRadius: 16,
              objectFit: "contain",
            }}
          />
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
