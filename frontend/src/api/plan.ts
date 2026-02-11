import { api } from "./client";

export const planApi = {
  start: (projectId: string, description: string, referenceArtifactIds: string[] = []) =>
    api.post<{ status: string }>(`/api/projects/${projectId}/plan`, {
      description,
      reference_artifact_ids: referenceArtifactIds,
    }),
};
