import dagre from "@dagrejs/dagre";
import type { Artifact, ArtifactConnection, Group } from "../../../vscodeApi";

export const CARD_WIDTH = 300;
export const CARD_HEIGHT = 200;
export const VIDEO_WIDTH = 480;
export const VIDEO_HEIGHT = 320;
export const GAP = 40;
export const GRID_COLS = 4;
export const GROUP_HEADER_HEIGHT = 50;
export const GROUP_PADDING = 20;

export interface LayoutResult {
  artifacts: Array<Artifact & { layoutX: number; layoutY: number }>;
  groups: Array<Group & { layoutX: number; layoutY: number; layoutW: number; layoutH: number }>;
}

export function computeGridLayout(
  artifacts: Artifact[],
  groups: Group[]
): LayoutResult {
  const layoutArtifacts: LayoutResult["artifacts"] = [];
  const layoutGroups: LayoutResult["groups"] = [];
  const assigned = new Set<string>();
  let yOffset = 0;

  for (const group of groups) {
    const groupArtifacts = artifacts.filter((a) => a.group_id === group.id);
    if (groupArtifacts.length === 0) continue;

    const rows = Math.ceil(groupArtifacts.length / GRID_COLS);
    const groupWidth = GRID_COLS * (CARD_WIDTH + GAP) + GROUP_PADDING * 2;
    const groupHeight = rows * (CARD_HEIGHT + GAP) + GROUP_HEADER_HEIGHT + GROUP_PADDING * 2;

    layoutGroups.push({ ...group, layoutX: 0, layoutY: yOffset, layoutW: groupWidth, layoutH: groupHeight });

    for (let i = 0; i < groupArtifacts.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      layoutArtifacts.push({
        ...groupArtifacts[i]!,
        layoutX: GROUP_PADDING + col * (CARD_WIDTH + GAP),
        layoutY: yOffset + GROUP_HEADER_HEIGHT + GROUP_PADDING + row * (CARD_HEIGHT + GAP),
      });
      assigned.add(groupArtifacts[i]!.id);
    }
    yOffset += groupHeight + GAP;
  }

  const ungrouped = artifacts.filter((a) => !assigned.has(a.id));
  for (let i = 0; i < ungrouped.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    layoutArtifacts.push({
      ...ungrouped[i]!,
      layoutX: col * (CARD_WIDTH + GAP),
      layoutY: yOffset + row * (CARD_HEIGHT + GAP),
    });
  }

  return { artifacts: layoutArtifacts, groups: layoutGroups };
}

function computeDagLayout(
  artifacts: Artifact[],
  groups: Group[],
  connections: ArtifactConnection[]
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: GAP, ranksep: GAP * 2, marginx: GAP, marginy: GAP });
  g.setDefaultEdgeLabel(() => ({}));

  for (const a of artifacts) {
    g.setNode(a.id, { width: CARD_WIDTH, height: CARD_HEIGHT });
  }
  for (const c of connections) {
    g.setEdge(c.from_artifact_id, c.to_artifact_id);
  }

  dagre.layout(g);

  const posMap = new Map<string, { x: number; y: number }>();
  for (const a of artifacts) {
    const node = g.node(a.id);
    if (node) {
      posMap.set(a.id, { x: node.x - CARD_WIDTH / 2, y: node.y - CARD_HEIGHT / 2 });
    }
  }

  const layoutArtifacts: LayoutResult["artifacts"] = artifacts.map((a) => ({
    ...a,
    layoutX: posMap.get(a.id)?.x ?? 0,
    layoutY: posMap.get(a.id)?.y ?? 0,
  }));

  const layoutGroups: LayoutResult["groups"] = [];
  for (const group of groups) {
    const members = layoutArtifacts.filter((a) => a.group_id === group.id);
    if (members.length === 0) continue;
    const minX = Math.min(...members.map((m) => m.layoutX));
    const minY = Math.min(...members.map((m) => m.layoutY));
    const maxX = Math.max(...members.map((m) => m.layoutX + CARD_WIDTH));
    const maxY = Math.max(...members.map((m) => m.layoutY + CARD_HEIGHT));
    layoutGroups.push({
      ...group,
      layoutX: minX - GROUP_PADDING,
      layoutY: minY - GROUP_HEADER_HEIGHT - GROUP_PADDING,
      layoutW: maxX - minX + GROUP_PADDING * 2,
      layoutH: maxY - minY + GROUP_HEADER_HEIGHT + GROUP_PADDING * 2,
    });
  }

  return { artifacts: layoutArtifacts, groups: layoutGroups };
}

export function computeLayout(
  artifacts: Artifact[],
  groups: Group[],
  connections: ArtifactConnection[] = []
): LayoutResult {
  const regularArtifacts = artifacts.filter((a) => a.type !== "video");
  const videoArtifacts = artifacts.filter((a) => a.type === "video");

  const result =
    connections.length > 0
      ? computeDagLayout(regularArtifacts, groups, connections)
      : computeGridLayout(regularArtifacts, groups);

  if (videoArtifacts.length > 0) {
    const maxY = Math.max(0, ...result.artifacts.map((a) => a.layoutY + CARD_HEIGHT));
    for (let i = 0; i < videoArtifacts.length; i++) {
      result.artifacts.push({
        ...videoArtifacts[i]!,
        layoutX: i * (VIDEO_WIDTH + GAP),
        layoutY: maxY + GAP * 2,
      });
    }
  }

  return result;
}
