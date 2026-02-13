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
            sub_query: event.data.sub_query as string,
          });
          break;

        case "agent_thinking":
          store.setAgentStatus({
            agent_id: event.data.agent_id as string,
            status: "running",
            thinking: event.data.text as string,
          } as AgentStatus);
          break;

        case "artifact_created":
          store.addArtifact(event.data.artifact as unknown as Artifact);
          break;

        case "plan_artifact_created": {
          const artifact = event.data.artifact as unknown as Artifact;
          store.addArtifact(artifact);
          store.addPlanStage({
            id: artifact.id,
            label: artifact.title,
            status: "complete",
            detail: artifact.type,
          });
          break;
        }

        case "connection_created": {
          const conn = event.data as unknown as ArtifactConnection;
          store.addConnection(conn);
          store.addPlanStage({
            id: conn.id,
            label: conn.label || "Connection",
            status: "complete",
            detail: "connection",
          });
          break;
        }

        case "group_created":
          store.addGroup(event.data.group as unknown as Group);
          break;

        case "agent_complete":
          store.setAgentStatus({
            agent_id: event.data.agent_id as string,
            status: "complete",
            artifact_count: event.data.artifact_count as number,
          } as AgentStatus);
          break;

        case "images_generating": {
          const total = event.data.total as number;
          store.setImageGenerationProgress(total);
          store.addPlanStage({
            id: "images",
            label: "Generating images",
            status: "running",
            detail: `0/${total}`,
          });
          break;
        }

        case "image_generated":
          store.updateArtifactImage(
            event.data.artifact_id as string,
            event.data.image_url as string
          );
          store.incrementImageGeneration();
          {
            const progress = useProjectStore.getState().imageGenerationProgress;
            if (progress) {
              store.updatePlanStage("images", {
                detail: `${progress.completed}/${progress.total}`,
              });
            }
          }
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

        case "research_directions_planned":
          store.setResearchDirections(
            event.data.angles as { angle: string; sub_query: string }[]
          );
          break;

        case "images_complete":
          store.setImageGenerationProgress(null);
          break;

        case "design_image_ready":
          store.updateDesignOptionImage(
            event.data.option_id as string,
            event.data.image_url as string
          );
          break;

        case "design_images_complete":
          // Images already streamed individually — no-op
          break;

        case "plan_complete":
          store.updatePlanStage("images", { status: "complete" });
          store.setPlanning(false);
          store.setPlanClarifyingQuestions([]);
          store.setSelectedDirection(null);
          store.setPlanContext({});
          store.clearDesignState();
          store.setShowPlanWizard(false);
          // Re-fetch project to ensure canvas is in sync
          if (projectId) {
            setTimeout(() => {
              store.loadProject(projectId);
              store.clearPlanStages();
            }, 500);
          }
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
