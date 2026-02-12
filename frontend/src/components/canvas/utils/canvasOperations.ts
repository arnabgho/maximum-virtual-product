import type { Editor } from "tldraw";
import type { Artifact, ArtifactConnection, Group } from "../../../types";
import { CARD_WIDTH, CARD_HEIGHT } from "./canvasLayout";

/**
 * Create or update an artifact shape on the tldraw canvas.
 */
export function upsertArtifactShape(
  editor: Editor,
  artifact: Artifact,
  x?: number,
  y?: number
) {
  const shapeId = `shape:artifact_${artifact.id}` as any;
  const existing = editor.getShape(shapeId);

  const props = {
    w: CARD_WIDTH,
    h: CARD_HEIGHT,
    artifactId: artifact.id,
    title: artifact.title,
    summary: artifact.summary,
    artifactType: artifact.type,
    sourceUrl: artifact.source_url ?? "",
    importance: artifact.importance,
    references: artifact.references,
    phase: artifact.phase,
    groupId: artifact.group_id ?? "",
    feedbackCount: 0,
    imageUrl: artifact.image_url ?? "",
  };

  if (existing) {
    editor.updateShape({
      id: shapeId,
      type: "artifact" as any,
      props,
    } as any);
  } else {
    editor.createShape({
      id: shapeId,
      type: "artifact" as any,
      x: x ?? artifact.position_x,
      y: y ?? artifact.position_y,
      props,
    } as any);
  }
}

/**
 * Create or update a group frame shape.
 */
export function upsertGroupShape(
  editor: Editor,
  group: Group,
  x?: number,
  y?: number,
  w?: number,
  h?: number
) {
  const shapeId = `shape:group_${group.id}` as any;
  const existing = editor.getShape(shapeId);

  const props = {
    w: w ?? group.width,
    h: h ?? group.height,
    title: group.title,
    color: group.color,
  };

  if (existing) {
    editor.updateShape({
      id: shapeId,
      type: "group_frame" as any,
      props,
    } as any);
  } else {
    editor.createShape({
      id: shapeId,
      type: "group_frame" as any,
      x: x ?? group.position_x,
      y: y ?? group.position_y,
      props,
    } as any);
  }
}

/**
 * Create arrow connections between artifacts.
 */
export function createConnectionArrow(
  editor: Editor,
  connection: ArtifactConnection
) {
  const arrowId = `shape:conn_${connection.id}` as any;
  const fromId = `shape:artifact_${connection.from_artifact_id}` as any;
  const toId = `shape:artifact_${connection.to_artifact_id}` as any;

  // Verify both shapes exist
  if (!editor.getShape(fromId) || !editor.getShape(toId)) return;

  const existing = editor.getShape(arrowId);
  if (existing) return;

  editor.createShape({
    id: arrowId,
    type: "arrow",
    props: {
      start: {
        type: "binding",
        boundShapeId: fromId,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
      end: {
        type: "binding",
        boundShapeId: toId,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
      },
      labelColor:
        connection.connection_type === "competes"
          ? "red"
          : connection.connection_type === "depends"
            ? "orange"
            : "light-blue",
    },
  } as any);
}

/**
 * Sync all artifacts, groups, and connections to the canvas.
 */
export function syncCanvasState(
  editor: Editor,
  artifacts: Artifact[],
  groups: Group[],
  connections: ArtifactConnection[]
) {
  for (const group of groups) {
    upsertGroupShape(editor, group);
  }
  for (const artifact of artifacts) {
    upsertArtifactShape(editor, artifact);
  }
  for (const connection of connections) {
    createConnectionArrow(editor, connection);
  }
}

/**
 * Zoom to fit all content on the canvas.
 */
export function zoomToFit(editor: Editor) {
  editor.zoomToFit({ animation: { duration: 300 } });
}
