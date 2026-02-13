import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

type GroupNodeData = {
  title: string;
  color: string;
  width: number;
  height: number;
};

function GroupNodeInner({ data }: NodeProps) {
  const d = data as unknown as GroupNodeData;

  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        border: `2px dashed ${d.color}40`,
        borderRadius: 12,
        background: `${d.color}08`,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -1,
          left: 16,
          background: d.color,
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: "0 0 6px 6px",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        }}
      >
        {d.title}
      </div>
    </div>
  );
}

export const GroupNode = memo(GroupNodeInner);
