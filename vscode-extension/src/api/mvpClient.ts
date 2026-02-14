import * as vscode from "vscode";
import WebSocket from "ws";
import { getToken, clearCachedToken, signIn } from "../auth";
import type {
  Project,
  Artifact,
  ArtifactConnection,
  Group,
  Feedback,
  ClarifyingQuestion,
  PlanDirection,
  WSEvent,
} from "../types";

function getBackendUrl(): string {
  return vscode.workspace.getConfiguration("mvp").get("backendUrl", "http://localhost:8000");
}

function getWsUrl(): string {
  return getBackendUrl().replace("http://", "ws://").replace("https://", "wss://");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${getBackendUrl()}${path}`;
  const res = await fetch(url, { ...options, headers });

  // Auto-retry on 401: re-authenticate and replay the request once
  if (res.status === 401 && token) {
    clearCachedToken();
    try {
      const newToken = await signIn();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retry = await fetch(url, { ...options, headers });
        if (!retry.ok) {
          const error = await retry.json().catch(() => ({ detail: retry.statusText }));
          throw new Error((error as { detail?: string }).detail || "Request failed");
        }
        return retry.json() as Promise<T>;
      }
    } catch {
      // Fall through to original error
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((error as { detail?: string }).detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

// --- Project endpoints ---

export async function listProjects(): Promise<Project[]> {
  return request<Project[]>("/api/projects");
}

export async function createProject(title: string, description = ""): Promise<Project> {
  return request<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export async function getProject(projectId: string): Promise<Project> {
  return request<Project>(`/api/projects/${projectId}`);
}

// --- Clarifying questions ---

export async function getClarifyingQuestions(
  topic: string,
  description = ""
): Promise<{ questions: ClarifyingQuestion[]; suggested_name: string }> {
  return request(`/api/clarify`, {
    method: "POST",
    body: JSON.stringify({ query: topic, description }),
  });
}

// --- Research ---

export async function startResearch(
  projectId: string,
  query: string,
  context: Record<string, string> = {}
): Promise<void> {
  await request(`/api/projects/${projectId}/research`, {
    method: "POST",
    body: JSON.stringify({ query, context }),
  });
}

// --- Artifacts ---

export async function getArtifacts(projectId: string, phase?: string): Promise<Artifact[]> {
  const params = phase ? `?phase=${phase}` : "";
  return request<Artifact[]>(`/api/projects/${projectId}/artifacts${params}`);
}

export async function getConnections(projectId: string): Promise<ArtifactConnection[]> {
  return request<ArtifactConnection[]>(`/api/projects/${projectId}/connections`).catch(() => []);
}

export async function getGroups(projectId: string, phase?: string): Promise<Group[]> {
  const params = phase ? `?phase=${phase}` : "";
  return request<Group[]>(`/api/projects/${projectId}/groups${params}`).catch(() => []);
}

export async function getFeedback(projectId: string): Promise<Feedback[]> {
  return request<Feedback[]>(`/api/projects/${projectId}/feedback`).catch(() => []);
}

// --- Plan ---

export async function getPlanDirections(projectId: string): Promise<PlanDirection[]> {
  const data = await request<{ directions: PlanDirection[] }>(
    `/api/projects/${projectId}/plan-directions`
  );
  return data.directions || [];
}

export async function startPlan(
  projectId: string,
  description: string,
  referenceArtifactIds: string[] = [],
  context: Record<string, string> = {}
): Promise<void> {
  await request(`/api/projects/${projectId}/plan`, {
    method: "POST",
    body: JSON.stringify({
      description,
      reference_artifact_ids: referenceArtifactIds,
      context,
    }),
  });
}

// --- Feedback ---

export async function giveFeedback(
  projectId: string,
  artifactId: string,
  comment: string,
  bounds?: { x: number; y: number; w: number; h: number }
): Promise<Feedback> {
  return request<Feedback>(`/api/projects/${projectId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      artifact_id: artifactId,
      comment,
      source: "human",
      author: "VS Code",
      ...(bounds ? { bounds } : {}),
    }),
  });
}

export async function batchRegenerate(projectId: string): Promise<void> {
  await request(`/api/projects/${projectId}/batch-regenerate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function regenerateArtifact(projectId: string, artifactId: string): Promise<void> {
  await request(`/api/projects/${projectId}/artifacts/${artifactId}/regenerate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// --- Export ---

export async function exportPlan(projectId: string): Promise<string> {
  const data = await request<{ markdown: string }>(`/api/projects/${projectId}/export`);
  return data.markdown;
}

// --- WebSocket ---

export type WSListener = (event: WSEvent) => void;

export class ProjectWebSocket {
  private ws: WebSocket | null = null;
  private listeners: WSListener[] = [];

  connect(projectId: string): void {
    this.disconnect();
    const url = `${getWsUrl()}/ws/projects/${projectId}`;
    this.ws = new WebSocket(url);

    this.ws.on("message", (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSEvent;
        for (const listener of this.listeners) {
          listener(msg);
        }
      } catch {
        // ignore parse errors
      }
    });

    this.ws.on("error", (err) => {
      console.error("MVP WebSocket error:", err.message);
    });

    this.ws.on("close", () => {
      this.ws = null;
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onEvent(listener: WSListener): vscode.Disposable {
    this.listeners.push(listener);
    return new vscode.Disposable(() => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    });
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
