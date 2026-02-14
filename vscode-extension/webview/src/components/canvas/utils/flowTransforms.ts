import { MarkerType, type Node, type Edge } from "@xyflow/react";
import type { Artifact, ArtifactConnection, Group } from "../../../vscodeApi";
import { CARD_WIDTH, CARD_HEIGHT, VIDEO_WIDTH, VIDEO_HEIGHT, computeLayout } from "./canvasLayout";

const EDGE_COLORS: Record<string, string> = {
  related: "#3b82f6",
  depends: "#f59e0b",
  competes: "#ef4444",
  references: "#8b5cf6",
};

export function buildNodes(
  artifacts: Artifact[],
  groups: Group[],
  connections: ArtifactConnection[] = []
): Node[] {
  const layout = computeLayout(artifacts, groups, connections);

  const groupNodes: Node[] = layout.groups.map((g) => ({
    id: `group_${g.id}`,
    type: "group",
    position: { x: g.layoutX, y: g.layoutY },
    data: { title: g.title, color: g.color, width: g.layoutW, height: g.layoutH },
    draggable: false,
    selectable: false,
    zIndex: 0,
  }));

  const artifactNodes: Node[] = layout.artifacts.map((a) => ({
    id: `artifact_${a.id}`,
    type: "artifact",
    position: { x: a.layoutX, y: a.layoutY },
    data: {
      artifactId: a.id,
      title: a.title,
      summary: a.summary,
      type: a.type,
      sourceUrl: a.source_url,
      importance: a.importance,
      references: a.references,
      phase: a.phase,
      feedbackCount: 0,
      imageUrl: a.image_url ?? null,
    },
    style: {
      width: a.type === "video" ? VIDEO_WIDTH : CARD_WIDTH,
      height: a.type === "video" ? VIDEO_HEIGHT : CARD_HEIGHT,
    },
    zIndex: 1,
  }));

  return [...groupNodes, ...artifactNodes];
}

export function buildEdges(
  connections: ArtifactConnection[],
  artifacts: Artifact[]
): Edge[] {
  const artifactIds = new Set(artifacts.map((a) => a.id));
  return connections
    .filter((c) => artifactIds.has(c.from_artifact_id) && artifactIds.has(c.to_artifact_id))
    .map((c) => ({
      id: `edge_${c.id}`,
      source: `artifact_${c.from_artifact_id}`,
      target: `artifact_${c.to_artifact_id}`,
      type: "connection",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[c.connection_type] || "#3b82f6",
      },
      data: { connectionType: c.connection_type, label: c.label },
    }));
}
