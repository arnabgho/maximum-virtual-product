import type { Artifact, Group } from "../../../types";

export const CARD_WIDTH = 300;
export const CARD_HEIGHT = 200;
export const GAP = 40;
export const GRID_COLS = 4;
export const GROUP_HEADER_HEIGHT = 50;
export const GROUP_PADDING = 20;

export interface LayoutResult {
  artifacts: Array<Artifact & { layoutX: number; layoutY: number }>;
  groups: Array<
    Group & { layoutX: number; layoutY: number; layoutW: number; layoutH: number }
  >;
}

/**
 * Compute grid layout for artifacts, optionally grouped.
 */
export function computeLayout(
  artifacts: Artifact[],
  groups: Group[]
): LayoutResult {
  const layoutArtifacts: LayoutResult["artifacts"] = [];
  const layoutGroups: LayoutResult["groups"] = [];
  const assigned = new Set<string>();
  let yOffset = 0;

  // Layout grouped artifacts
  for (const group of groups) {
    const groupArtifacts = artifacts.filter((a) => a.group_id === group.id);
    if (groupArtifacts.length === 0) continue;

    const rows = Math.ceil(groupArtifacts.length / GRID_COLS);
    const groupWidth = GRID_COLS * (CARD_WIDTH + GAP) + GROUP_PADDING * 2;
    const groupHeight =
      rows * (CARD_HEIGHT + GAP) + GROUP_HEADER_HEIGHT + GROUP_PADDING * 2;

    layoutGroups.push({
      ...group,
      layoutX: 0,
      layoutY: yOffset,
      layoutW: groupWidth,
      layoutH: groupHeight,
    });

    for (let i = 0; i < groupArtifacts.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const artifact = groupArtifacts[i]!;

      layoutArtifacts.push({
        ...artifact,
        layoutX: GROUP_PADDING + col * (CARD_WIDTH + GAP),
        layoutY:
          yOffset +
          GROUP_HEADER_HEIGHT +
          GROUP_PADDING +
          row * (CARD_HEIGHT + GAP),
      });
      assigned.add(artifact.id);
    }

    yOffset += groupHeight + GAP;
  }

  // Layout ungrouped artifacts
  const ungrouped = artifacts.filter((a) => !assigned.has(a.id));
  for (let i = 0; i < ungrouped.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const artifact = ungrouped[i]!;

    layoutArtifacts.push({
      ...artifact,
      layoutX: col * (CARD_WIDTH + GAP),
      layoutY: yOffset + row * (CARD_HEIGHT + GAP),
    });
  }

  return { artifacts: layoutArtifacts, groups: layoutGroups };
}
