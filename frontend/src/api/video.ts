import { api } from "./client";

export const videoApi = {
  generate: (projectId: string) =>
    api.post<{ status: string; job_id: string }>(`/api/projects/${projectId}/video`, {}),
  getStatus: (projectId: string) =>
    api.get<{ status: string; url?: string }>(`/api/projects/${projectId}/video/status`),
};
