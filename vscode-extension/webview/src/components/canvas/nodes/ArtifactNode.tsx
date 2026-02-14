import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArtifactCard } from "../shapes/ArtifactCard";
import { useExtensionStore } from "../../../stores/extensionStore";

type ArtifactNodeData = {
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
};

function ArtifactNodeInner({ data }: NodeProps) {
  const d = data as unknown as ArtifactNodeData;
  const selectedArtifactId = useExtensionStore((s) => s.selectedArtifactId);
  const isSelected = selectedArtifactId === d.artifactId;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        outline: isSelected ? "2px solid var(--accent-cyan)" : "none",
        outlineOffset: 2,
        boxShadow: isSelected ? "0 0 15px rgba(0, 229, 255, 0.15)" : "none",
      }}
    >
      <ArtifactCard
        artifactId={d.artifactId}
        title={d.title}
        summary={d.summary}
        type={d.type}
        sourceUrl={d.sourceUrl}
        importance={d.importance}
        references={d.references}
        phase={d.phase}
        feedbackCount={d.feedbackCount}
        imageUrl={d.imageUrl}
      />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

export const ArtifactNode = memo(ArtifactNodeInner);
