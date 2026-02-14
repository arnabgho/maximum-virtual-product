import { useState } from "react";
import { useExtensionStore } from "../../../stores/extensionStore";

interface ArtifactCardProps {
  artifactId: string;
  title: string;
  summary: string;
  type: string;
  sourceUrl: string | null;
  importance: number;
  references: string[];
  phase: string;
  feedbackCount: number;
  imageUrl: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  research_finding: "\uD83D\uDD0D",
  competitor: "\u2694\uFE0F",
  plan_component: "\uD83E\uDDE9",
  ui_screen: "\uD83D\uDDA5\uFE0F",
  markdown: "\uD83D\uDCDD",
  mermaid: "\uD83D\uDCCA",
  image: "\uD83D\uDDBC\uFE0F",
  video: "\uD83C\uDFAC",
};

const TYPE_COLORS: Record<string, string> = {
  research_finding: "#6366f1",
  competitor: "#f59e0b",
  plan_component: "#10b981",
  ui_screen: "#0ea5e9",
  markdown: "#8b5cf6",
  mermaid: "#06b6d4",
  image: "#ec4899",
  video: "#a855f7",
};

export function ArtifactCard({
  artifactId,
  title,
  summary,
  type,
  sourceUrl,
  importance,
  references,
  phase,
  feedbackCount,
  imageUrl,
}: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const setSelectedArtifact = useExtensionStore((s) => s.setSelectedArtifact);

  const borderColor = TYPE_COLORS[type] || "#6366f1";
  const icon = TYPE_ICONS[type] || "\uD83D\uDCC4";

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(artifactId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClick = () => {
    setSelectedArtifact(artifactId);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--bg-surface)",
        border: `2px solid ${borderColor}20`,
        borderRadius: 6,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        overflow: "hidden",
        fontFamily: "var(--vscode-font-family, sans-serif)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 10, color: borderColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {type.replace("_", " ")}
        </span>
        {phase === "plan" && references.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 9, background: "#6366f120", color: "#818cf8", padding: "1px 6px", borderRadius: 4 }}>
            {references.length} ref{references.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Image thumbnail */}
      {imageUrl && type !== "video" && (
        <div style={{ marginBottom: 6, borderRadius: 4, overflow: "hidden", maxHeight: 120, flexShrink: 0 }}>
          <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: imageUrl ? 1 : 2, WebkitBoxOrient: "vertical" }}>
        {title}
      </div>

      {/* Summary */}
      {!imageUrl && type !== "video" && (
        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {summary}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-dim)" }}>
        <button
          onClick={handleCopyId}
          style={{
            display: "flex", alignItems: "center", gap: 4, padding: "2px 6px",
            background: "var(--bg-elevated)", border: "1px solid var(--border-dim)", borderRadius: 4,
            color: "#71717a", fontSize: 10, fontFamily: "var(--vscode-editor-font-family, monospace)", cursor: "pointer",
          }}
        >
          {artifactId}
          <span style={{ fontSize: 9, color: copied ? "#10b981" : "#52525b" }}>
            {copied ? "\u2713" : "\u2398"}
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {sourceUrl && <span style={{ fontSize: 10, color: "#6366f1" }} title={sourceUrl}>{"\uD83D\uDD17"}</span>}
          {feedbackCount > 0 && (
            <span style={{ fontSize: 9, background: "#f59e0b20", color: "#f59e0b", padding: "1px 5px", borderRadius: 4 }}>
              {feedbackCount} {"\uD83D\uDCAC"}
            </span>
          )}
          <span style={{ fontSize: 10, color: importance > 70 ? "#10b981" : importance > 40 ? "#f59e0b" : "#71717a", fontWeight: 600 }}>
            {importance}
          </span>
        </div>
      </div>
    </div>
  );
}
