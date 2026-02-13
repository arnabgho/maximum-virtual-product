import { api } from "./client";
import type { ClarifyingQuestion } from "../types";

export const researchApi = {
  start: (projectId: string, query: string, context: Record<string, string> = {}) =>
    api.post<{ status: string }>(`/api/projects/${projectId}/research`, { query, context }),

  clarify: (query: string, description: string = "") =>
    api.post<{ questions: ClarifyingQuestion[]; suggested_name: string }>(`/api/clarify`, { query, description }),
};
