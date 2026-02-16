import * as vscode from "vscode";
import { getWebviewContent } from "./getWebviewContent";
import * as api from "../api/mvpClient";
import { ProjectWebSocket } from "../api/mvpClient";
import type { ExtToWebview, WebviewToExt, PlanDirection, WSEvent } from "../types";
import type { ProgressTracker } from "../services/ProgressTracker";

export class CanvasPanel {
  private static panels = new Map<string, CanvasPanel>();
  private static progressTracker: ProgressTracker | undefined;

  static setProgressTracker(tracker: ProgressTracker): void {
    CanvasPanel.progressTracker = tracker;
  }

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private projectId: string;
  private ws: ProjectWebSocket;
  private onRefreshSidebar: () => void;
  private webviewReady = false;
  private pendingEvents: WSEvent[] = [];
  private pendingWizardMessage: ExtToWebview | null = null;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    projectId: string,
    onRefreshSidebar: () => void
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.projectId = projectId;
    this.onRefreshSidebar = onRefreshSidebar;
    this.ws = new ProjectWebSocket();

    // Set webview HTML
    this.panel.webview.html = getWebviewContent(this.panel.webview, this.extensionUri);

    // Connect WS immediately so we capture events while webview boots
    this.connectWebSocket(projectId);

    // Listen for messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewToExt) => this.handleWebviewMessage(msg),
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Forward theme changes
    vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        this.postMessage({
          type: "themeChanged",
          kind: theme.kind === vscode.ColorThemeKind.Light ? "light" : "dark",
        });
      },
      null,
      this.disposables
    );
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    projectId: string,
    onRefreshSidebar: () => void
  ): CanvasPanel {
    // If panel for this project exists, reveal it
    const existing = CanvasPanel.panels.get(projectId);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }

    // Create new panel — use Beside if there's already an open panel, otherwise One
    const viewColumn = CanvasPanel.panels.size > 0 ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
    const panel = vscode.window.createWebviewPanel(
      `mvp-canvas-${projectId}`,
      "MVB Canvas",
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview", "dist")],
      }
    );

    const canvasPanel = new CanvasPanel(panel, extensionUri, projectId, onRefreshSidebar);
    CanvasPanel.panels.set(projectId, canvasPanel);
    // WS connects in constructor. The webview sends a "ready" message once its
    // JS boots, which triggers loadProjectAndFlush() to send data + buffered events.
    return canvasPanel;
  }

  static disposeAll(): void {
    for (const panel of CanvasPanel.panels.values()) {
      panel.dispose();
    }
  }

  startPlanWizard(directions: PlanDirection[]): void {
    const msg: ExtToWebview = { type: "startPlanWizard", directions };
    if (this.webviewReady) {
      this.postMessage(msg);
    } else {
      this.pendingWizardMessage = msg;
    }
  }

  private connectWebSocket(projectId: string): void {
    this.ws.disconnect();
    this.ws.connect(projectId);

    this.ws.onEvent((event: WSEvent) => {
      if (!this.webviewReady) {
        this.pendingEvents.push(event);
        return;
      }
      this.forwardWSEvent(event);
    });
  }

  private forwardWSEvent(event: WSEvent): void {
    this.postMessage({ type: "wsEvent", event });

    if (
      event.type === "research_complete" ||
      event.type === "plan_complete" ||
      event.type === "batch_regenerate_complete"
    ) {
      this.onRefreshSidebar();
      setTimeout(() => this.refreshProjectData(), 1500);
    }
  }

  private async loadProjectAndFlush(): Promise<void> {
    try {
      const [project, artifacts, connections, groups, feedback] = await Promise.all([
        api.getProject(this.projectId),
        api.getArtifacts(this.projectId),
        api.getConnections(this.projectId),
        api.getGroups(this.projectId),
        api.getFeedback(this.projectId),
      ]);

      this.panel.title = `MVB: ${project.title}`;

      this.postMessage({
        type: "loadProject",
        project,
        artifacts,
        connections,
        groups,
        feedback,
      });

      // Flush buffered WS events (processed in order after loadProject)
      for (const event of this.pendingEvents) {
        this.forwardWSEvent(event);
      }
      this.pendingEvents = [];

      // Flush pending wizard message
      if (this.pendingWizardMessage) {
        this.postMessage(this.pendingWizardMessage);
        this.pendingWizardMessage = null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Failed to load project: ${msg}`);
    }
  }

  private async refreshProjectData(): Promise<void> {
    try {
      const [project, artifacts, connections, groups, feedback] = await Promise.all([
        api.getProject(this.projectId),
        api.getArtifacts(this.projectId),
        api.getConnections(this.projectId),
        api.getGroups(this.projectId),
        api.getFeedback(this.projectId),
      ]);

      this.panel.title = `MVB: ${project.title}`;

      this.postMessage({
        type: "loadProject",
        project,
        artifacts,
        connections,
        groups,
        feedback,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Failed to refresh project: ${msg}`);
    }
  }

  private async handleWebviewMessage(msg: WebviewToExt): Promise<void> {
    switch (msg.type) {
      case "ready":
        this.webviewReady = true;
        if (this.projectId) {
          await this.loadProjectAndFlush();
        }
        break;

      case "giveFeedback":
        if (this.projectId) {
          try {
            await api.giveFeedback(this.projectId, msg.artifactId, msg.comment, msg.bounds);
            // Refresh feedback
            const feedback = await api.getFeedback(this.projectId);
            this.postMessage({ type: "feedbackUpdated", feedback });
            this.onRefreshSidebar();
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`Failed to submit feedback: ${errMsg}`);
          }
        }
        break;

      case "regenerate":
        if (this.projectId) {
          try {
            await api.regenerateArtifact(this.projectId, msg.artifactId);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`Failed to regenerate: ${errMsg}`);
          }
        }
        break;

      case "batchRegenerate":
        if (this.projectId) {
          try {
            await api.batchRegenerate(this.projectId);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`Batch regenerate failed: ${errMsg}`);
          }
        }
        break;

      case "exportPlan":
        if (this.projectId) {
          vscode.commands.executeCommand("mvp.exportPlan", this.projectId);
        }
        break;

      case "openInBrowser":
        if (this.projectId) {
          vscode.commands.executeCommand("mvp.openInBrowser", this.projectId);
        }
        break;

      case "requestDesignPreferences":
        if (this.projectId) {
          try {
            const result = await api.getDesignPreferences(this.projectId, msg.direction);
            this.postMessage({ type: "designPreferencesResult", dimensions: result.dimensions || [] });
          } catch (e) {
            console.error("Design preferences failed:", e);
            this.postMessage({ type: "designPreferencesResult", dimensions: [] });
          }
        }
        break;

      case "requestPlanClarify":
        if (this.projectId) {
          try {
            const result = await api.getPlanClarify(this.projectId, msg.direction);
            this.postMessage({ type: "planClarifyResult", questions: result.questions || [] });
          } catch (e) {
            console.error("Plan clarify failed:", e);
            this.postMessage({ type: "planClarifyResult", questions: [] });
          }
        }
        break;

      case "submitPlan":
        if (this.projectId) {
          try {
            // Build description from direction
            const dir = msg.direction;
            const description = dir.key_focus
              ? `${dir.title}: ${dir.description}\n\nKey focus: ${dir.key_focus}`
              : `${dir.title}: ${dir.description}`;

            // Merge design preferences + clarifying answers as context
            const context = { ...msg.designPrefs, ...msg.clarifyAnswers };

            // Fetch research artifact IDs
            let refIds: string[] = [];
            try {
              const artifacts = await api.getArtifacts(this.projectId, "research");
              refIds = artifacts.map((a) => a.id);
            } catch { /* proceed without refs */ }

            // Fetch project title for progress
            let projectTitle = "Plan";
            try {
              const project = await api.getProject(this.projectId);
              projectTitle = project.title;
            } catch { /* use default */ }

            await api.startPlan(this.projectId, description, refIds, context);
            CanvasPanel.progressTracker?.trackPlan(this.projectId, projectTitle);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`Failed to generate plan: ${errMsg}`);
          }
        }
        break;
    }
  }

  private postMessage(msg: ExtToWebview): void {
    this.panel.webview.postMessage(msg);
  }

  dispose(): void {
    CanvasPanel.panels.delete(this.projectId);
    this.ws.disconnect();
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}
