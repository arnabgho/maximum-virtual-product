import * as vscode from "vscode";
import { ProjectWebSocket, type WSListener } from "../api/mvpClient";
import type { WSEvent } from "../types";

export type OperationType = "research" | "plan";

export interface TrackedOperation {
  projectId: string;
  projectTitle: string;
  type: OperationType;
  agentTotal: number;
  agentComplete: number;
  artifactCount: number;
  connectionCount: number;
  lastMessage: string;
  startedAt: number;
}

const SAFETY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DEBOUNCE_MS = 1000;

export class ProgressTracker {
  private operations = new Map<string, TrackedOperation>();
  private webSockets = new Map<string, ProjectWebSocket>();
  private progressResolvers = new Map<string, () => void>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private debounceTimer: NodeJS.Timeout | undefined;

  trackResearch(projectId: string, projectTitle: string): void {
    this.track(projectId, projectTitle, "research");
  }

  trackPlan(projectId: string, projectTitle: string): void {
    this.track(projectId, projectTitle, "plan");
  }

  getOperation(projectId: string): TrackedOperation | undefined {
    return this.operations.get(projectId);
  }

  isActive(projectId: string): boolean {
    return this.operations.has(projectId);
  }

  private track(projectId: string, projectTitle: string, type: OperationType): void {
    // Clean up any existing tracking for this project
    this.cleanup(projectId);

    const op: TrackedOperation = {
      projectId,
      projectTitle,
      type,
      agentTotal: 0,
      agentComplete: 0,
      artifactCount: 0,
      connectionCount: 0,
      lastMessage: type === "research" ? "Starting research..." : "Generating plan...",
      startedAt: Date.now(),
    };
    this.operations.set(projectId, op);

    // Connect WebSocket
    const ws = new ProjectWebSocket();
    ws.connect(projectId);
    this.webSockets.set(projectId, ws);

    ws.onEvent((event: WSEvent) => this.handleEvent(projectId, event));

    // Show VS Code progress notification
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `MVB: ${projectTitle}`,
        cancellable: false,
      },
      (progress) => {
        // Update the progress message immediately
        progress.report({ message: op.lastMessage });

        return new Promise<void>((resolve) => {
          this.progressResolvers.set(projectId, resolve);

          // Listen for operation changes to update progress bar
          const disposable = this.onDidChange(() => {
            const current = this.operations.get(projectId);
            if (current) {
              progress.report({ message: current.lastMessage });
            } else {
              disposable.dispose();
            }
          });
        });
      }
    );

    // Safety timeout
    const timeout = setTimeout(() => {
      this.complete(projectId, "Timed out — check the canvas for results.");
    }, SAFETY_TIMEOUT_MS);
    this.timeouts.set(projectId, timeout);

    this.fireChange();
  }

  private handleEvent(projectId: string, event: WSEvent): void {
    const op = this.operations.get(projectId);
    if (!op) return;

    const data = event.data;

    switch (event.type) {
      case "research_directions_planned": {
        const angles = data.angles as { angle: string; sub_query: string }[];
        op.agentTotal = angles?.length || 0;
        const queries = angles?.map(a => a.sub_query).join(", ").slice(0, 80);
        op.lastMessage = `Planned ${op.agentTotal} agents: ${queries}...`;
        break;
      }

      case "agent_started":
        op.lastMessage = `Agent ${op.agentComplete + 1}/${op.agentTotal || "?"}: ${(data.sub_query as string) || (data.focus_area as string) || "Starting"}`;
        break;

      case "agent_thinking":
        op.lastMessage = `Agent ${op.agentComplete + 1}/${op.agentTotal || "?"}: ${(data.text as string)?.slice(0, 80) || "Thinking"}...`;
        break;

      case "artifact_created":
      case "plan_artifact_created": {
        op.artifactCount++;
        const title = ((data.artifact as Record<string, unknown>)?.title as string) || "";
        op.lastMessage = title
          ? `Found: ${title} (${op.artifactCount} total)`
          : `${op.artifactCount} artifact${op.artifactCount > 1 ? "s" : ""} created`;
        break;
      }

      case "group_created": {
        const groupTitle = ((data.group as Record<string, unknown>)?.title as string) || "findings";
        op.lastMessage = `Organizing: ${groupTitle}`;
        break;
      }

      case "connection_created":
        op.connectionCount = (op.connectionCount || 0) + 1;
        op.lastMessage = `Mapping ${op.connectionCount} connection${op.connectionCount > 1 ? "s" : ""}...`;
        break;

      case "agent_complete":
        op.agentComplete++;
        op.lastMessage = `Agent ${op.agentComplete}/${op.agentTotal || "?"} complete (${op.artifactCount} artifacts)`;
        break;

      case "plan_directions_ready":
        op.lastMessage = "Strategic directions ready";
        break;

      case "images_generating":
        op.lastMessage = "Generating images...";
        break;

      case "image_generated":
        op.lastMessage = `Image generated for ${(data.artifact_id as string)?.slice(0, 12) || "artifact"}`;
        break;

      case "images_complete":
        op.lastMessage = "All images generated";
        break;

      case "research_complete":
        this.complete(projectId, `Research complete — ${op.artifactCount} artifacts`);
        return;

      case "plan_complete":
        this.complete(projectId, `Plan complete — ${op.artifactCount} components`);
        return;

      case "batch_regenerate_complete":
        this.complete(projectId, "Regeneration complete");
        return;

      case "error":
        this.complete(projectId, `Error: ${(data.message as string) || "Unknown error"}`);
        return;
    }

    this.fireChange();
  }

  private complete(projectId: string, message: string): void {
    const op = this.operations.get(projectId);
    const type = op?.type;

    // Show completion toast with action buttons
    const actions: string[] = ["Open Canvas"];
    if (type === "plan") {
      actions.push("Export Plan");
    }

    vscode.window.showInformationMessage(`MVB: ${message}`, ...actions).then((action) => {
      if (action === "Open Canvas") {
        vscode.commands.executeCommand("mvp.openCanvas", projectId);
      } else if (action === "Export Plan") {
        vscode.commands.executeCommand("mvp.exportPlan", projectId);
      }
    });

    this.cleanup(projectId);
    this.fireChange();
  }

  private cleanup(projectId: string): void {
    this.operations.delete(projectId);

    const resolver = this.progressResolvers.get(projectId);
    if (resolver) {
      resolver();
      this.progressResolvers.delete(projectId);
    }

    const ws = this.webSockets.get(projectId);
    if (ws) {
      ws.disconnect();
      this.webSockets.delete(projectId);
    }

    const timeout = this.timeouts.get(projectId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(projectId);
    }
  }

  private fireChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this._onDidChange.fire();
    }, DEBOUNCE_MS);
  }

  dispose(): void {
    for (const projectId of [...this.operations.keys()]) {
      this.cleanup(projectId);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this._onDidChange.dispose();
  }
}
