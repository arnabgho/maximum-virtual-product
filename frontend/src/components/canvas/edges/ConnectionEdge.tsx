import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

const TYPE_COLORS: Record<string, string> = {
  related: "#3b82f6",
  depends: "#f59e0b",
  competes: "#ef4444",
  references: "#8b5cf6",
};

type ConnectionEdgeData = {
  connectionType: string;
  label: string;
};

export function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const d = data as unknown as ConnectionEdgeData;
  const color = TYPE_COLORS[d.connectionType] || "#3b82f6";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 2 }} markerEnd={markerEnd} />
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "#1e1e2e",
              color: color,
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              border: `1px solid ${color}40`,
              pointerEvents: "none",
            }}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
