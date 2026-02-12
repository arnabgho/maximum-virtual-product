import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArtifactCard } from "../shapes/ArtifactCard";
import { useProjectStore } from "../../../stores/projectStore";

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
  const selectedArtifactId = useProjectStore((s) => s.selectedArtifactId);
  const isSelected = selectedArtifactId === d.artifactId;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        outline: isSelected ? "2px solid #6366f1" : "none",
        outlineOffset: 2,
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
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

export const ArtifactNode = memo(ArtifactNodeInner);
