import { api } from "./client";
import type { ClarifyingQuestion, DesignDimension, PlanDirection } from "../types";

export const planApi = {
  start: (
    projectId: string,
    description: string,
    referenceArtifactIds: string[] = [],
    context?: Record<string, string>,
  ) =>
    api.post<{ status: string }>(`/api/projects/${projectId}/plan`, {
      description,
      reference_artifact_ids: referenceArtifactIds,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    }),

  clarify: (projectId: string, direction: PlanDirection | Record<string, string>) =>
    api.post<{ questions: ClarifyingQuestion[] }>(
      `/api/projects/${projectId}/plan-clarify`,
      { direction },
    ),

  designPreferences: (projectId: string, direction: Record<string, string>) =>
    api.post<{ dimensions: DesignDimension[] }>(
      `/api/projects/${projectId}/design-preferences`,
      { direction },
    ),
};
