import { api } from "./client";

export const researchApi = {
  start: (projectId: string, query: string) =>
    api.post<{ status: string }>(`/api/projects/${projectId}/research`, { query }),
};
