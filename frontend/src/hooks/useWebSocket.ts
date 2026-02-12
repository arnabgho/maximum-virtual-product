import { useEffect, useRef } from "react";
import { ProjectWebSocket } from "../api/websocket";
import { useProjectStore } from "../stores/projectStore";
import type { Artifact, ArtifactConnection, Group, AgentStatus, PlanDirection } from "../types";

export function useWebSocket(projectId: string | null) {
  const wsRef = useRef<ProjectWebSocket | null>(null);
  const store = useProjectStore();

  useEffect(() => {
    if (!projectId) return;

    const ws = new ProjectWebSocket(projectId);
    wsRef.current = ws;

    ws.onEvent((event) => {
      switch (event.type) {
        case "agent_started":
          store.setAgentStatus({
            agent_id: event.data.agent_id as string,
            focus_area: event.data.focus_area as string,
            status: "running",
            artifact_count: 0,
          });
          break;

        case "agent_thinking":
          store.setAgentStatus({
            agent_id: event.data.agent_id as string,
            focus_area: "",
            status: "running",
            artifact_count: 0,
            thinking: event.data.text as string,
          });
          break;

        case "artifact_created":
        case "plan_artifact_created":
          store.addArtifact(event.data.artifact as unknown as Artifact);
          break;

        case "connection_created":
          store.addConnection(event.data as unknown as ArtifactConnection);
          break;

        case "group_created":
          store.addGroup(event.data.group as unknown as Group);
          break;

        case "agent_complete":
          store.setAgentStatus({
            agent_id: event.data.agent_id as string,
            focus_area: "",
            status: "complete",
            artifact_count: event.data.artifact_count as number,
          });
          break;

        case "images_generating":
          store.setImageGenerationProgress(event.data.total as number);
          break;

        case "image_generated":
          store.updateArtifactImage(
            event.data.artifact_id as string,
            event.data.image_url as string
          );
          store.incrementImageGeneration();
          break;

        case "artifact_updated":
          store.updateArtifact(event.data.artifact as unknown as Artifact);
          store.setRegenerating(null);
          break;

        case "feedback_addressed":
          store.markFeedbackAddressed(event.data.artifact_id as string);
          break;

        case "research_complete":
          store.setResearching(false);
          break;

        case "plan_directions_ready":
          store.setPlanDirections(event.data.directions as unknown as PlanDirection[]);
          break;

        case "images_complete":
          store.setImageGenerationProgress(null);
          break;

        case "plan_complete":
          store.setPlanning(false);
          break;

        case "error":
          console.error("WS error:", event.data.message);
          store.setResearching(false);
          store.setPlanning(false);
          break;
      }
    });

    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [projectId]);

  return wsRef;
}
