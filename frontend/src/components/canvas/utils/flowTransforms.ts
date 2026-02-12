import type { Node, Edge } from "@xyflow/react";
import type { Artifact, ArtifactConnection, Group } from "../../../types";
import { CARD_WIDTH, CARD_HEIGHT, computeLayout } from "./canvasLayout";

/**
 * Build React Flow nodes from artifacts and groups.
 * Groups render at zIndex 0, artifacts at zIndex 1.
 * Uses computeLayout for initial positions; preserves existing position_x/y
 * if they've been set (non-zero).
 */
export function buildNodes(
  artifacts: Artifact[],
  groups: Group[]
): Node[] {
  const layout = computeLayout(artifacts, groups);

  const groupNodes: Node[] = layout.groups.map((g) => ({
    id: `group_${g.id}`,
    type: "group",
    position: { x: g.layoutX, y: g.layoutY },
    data: {
      title: g.title,
      color: g.color,
      width: g.layoutW,
      height: g.layoutH,
    },
    draggable: false,
    selectable: false,
    zIndex: 0,
  }));

  const artifactNodes: Node[] = layout.artifacts.map((a) => {
    const hasCustomPosition = a.position_x !== 0 || a.position_y !== 0;
    return {
      id: `artifact_${a.id}`,
      type: "artifact",
      position: hasCustomPosition
        ? { x: a.position_x, y: a.position_y }
        : { x: a.layoutX, y: a.layoutY },
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
      style: { width: CARD_WIDTH, height: CARD_HEIGHT },
      zIndex: 1,
    };
  });

  return [...groupNodes, ...artifactNodes];
}

/**
 * Build React Flow edges from connections.
 * Filters to only connections where both endpoint artifacts exist.
 */
export function buildEdges(
  connections: ArtifactConnection[],
  artifacts: Artifact[]
): Edge[] {
  const artifactIds = new Set(artifacts.map((a) => a.id));

  return connections
    .filter(
      (c) =>
        artifactIds.has(c.from_artifact_id) &&
        artifactIds.has(c.to_artifact_id)
    )
    .map((c) => ({
      id: `edge_${c.id}`,
      source: `artifact_${c.from_artifact_id}`,
      target: `artifact_${c.to_artifact_id}`,
      type: "connection",
      data: {
        connectionType: c.connection_type,
        label: c.label,
      },
    }));
}
