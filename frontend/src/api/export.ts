import { api } from "./client";

export const exportApi = {
  getMarkdown: (projectId: string) =>
    api.get<{ markdown: string; project_id: string }>(
      `/api/projects/${projectId}/export`
    ),
};
