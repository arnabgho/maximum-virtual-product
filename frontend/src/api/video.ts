import { api } from "./client";

export const videoApi = {
  generate: (projectId: string, phase: string = "research") =>
    api.post<{ status: string; job_id: string }>(`/api/projects/${projectId}/video`, { phase }),
  getStatus: (projectId: string, phase?: string) =>
    api.get<{ status: string; url?: string }>(
      `/api/projects/${projectId}/video/status${phase ? `?phase=${phase}` : ""}`
    ),
};
