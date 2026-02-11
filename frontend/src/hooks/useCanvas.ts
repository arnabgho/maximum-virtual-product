import { useCallback } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api } from "../api/client";

export function useCanvas() {
  const { artifacts, connections, updateArtifactPosition } = useProjectStore();

  const handleArtifactMove = useCallback(
    async (artifactId: string, x: number, y: number) => {
      updateArtifactPosition(artifactId, x, y);
      await api.patch(`/api/artifacts/${artifactId}`, {
        position_x: x,
        position_y: y,
      });
    },
    [updateArtifactPosition]
  );

  return { artifacts, connections, handleArtifactMove };
}
