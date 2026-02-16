import * as vscode from "vscode";
import { getWebviewContent } from "./getWebviewContent";
import * as api from "../api/mvpClient";
import { ProjectWebSocket } from "../api/mvpClient";
import type { ExtToWebview, WebviewToExt, PlanDirection, ClarifyingQuestion, WSEvent, Phase } from "../types";
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
  private phase: Phase | undefined;
  private ws: ProjectWebSocket;
  private onRefreshSidebar: () => void;
  private webviewReady = false;
  private pendingEvents: WSEvent[] = [];
  private pendingWizardMessage: ExtToWebview | null = null;

  private get panelKey(): string {
    if (!this.projectId) return "wizard";
    return this.phase ? `${this.projectId}:${this.phase}` : this.projectId;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    projectId: string,
    onRefreshSidebar: () => void,
    phase?: Phase
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.projectId = projectId;
    this.phase = phase;
    this.onRefreshSidebar = onRefreshSidebar;
    this.ws = new ProjectWebSocket();

    // Set webview HTML
    this.panel.webview.html = getWebviewContent(this.panel.webview, this.extensionUri);

    // Connect WS immediately so we capture events while webview boots — but only if we have a projectId
    if (projectId) {
      this.connectWebSocket(projectId);
    }

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
    onRefreshSidebar: () => void,
    phase?: Phase
  ): CanvasPanel {
    // Key panels by projectId:phase so research and plan get independent tabs
    const panelKey = phase ? `${projectId}:${phase}` : projectId;

    // If panel for this key exists, reveal it
    const existing = CanvasPanel.panels.get(panelKey);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }

    // Create new panel — use Beside if there's already an open panel, otherwise One
    const viewColumn = CanvasPanel.panels.size > 0 ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
    const phaseLabel = phase ? ` (${phase === "research" ? "Research" : "Plan"})` : "";
    const panel = vscode.window.createWebviewPanel(
      `mvp-canvas-${panelKey}`,
      `MVB Canvas${phaseLabel}`,
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview", "dist")],
      }
    );

    const canvasPanel = new CanvasPanel(panel, extensionUri, projectId, onRefreshSidebar, phase);
    CanvasPanel.panels.set(panelKey, canvasPanel);
    // WS connects in constructor. The webview sends a "ready" message once its
    // JS boots, which triggers loadProjectAndFlush() to send data + buffered events.
    return canvasPanel;
  }

  /** Open a canvas panel in wizard mode (no projectId yet). */
  static createWizard(
    extensionUri: vscode.Uri,
    onRefreshSidebar: () => void
  ): CanvasPanel {
    const panelKey = "wizard";
    const existing = CanvasPanel.panels.get(panelKey);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }

    const viewColumn = CanvasPanel.panels.size > 0 ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
    const panel = vscode.window.createWebviewPanel(
      "mvp-canvas-wizard",
      "MVB: New Research",
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview", "dist")],
      }
    );

    const canvasPanel = new CanvasPanel(panel, extensionUri, "", onRefreshSidebar);
    CanvasPanel.panels.set(panelKey, canvasPanel);
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

  startResearchWizard(topic?: string, description?: string, questions?: ClarifyingQuestion[], suggestedName?: string): void {
    const msg: ExtToWebview = {
      type: "startResearchWizard",
      topic: topic || "",
      description: description || "",
      questions: questions || [],
      suggestedName: suggestedName || "",
    };
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
        api.getArtifacts(this.projectId, this.phase),
        api.getConnections(this.projectId),
        api.getGroups(this.projectId, this.phase),
        api.getFeedback(this.projectId),
      ]);

      const phaseLabel = this.phase ? ` (${this.phase === "research" ? "Research" : "Plan"})` : "";
      this.panel.title = `MVB: ${project.title}${phaseLabel}`;

      this.postMessage({
        type: "loadProject",
        project,
        artifacts,
        connections,
        groups,
        feedback,
        displayPhase: this.phase,
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
        api.getArtifacts(this.projectId, this.phase),
        api.getConnections(this.projectId),
        api.getGroups(this.projectId, this.phase),
        api.getFeedback(this.projectId),
      ]);

      const phaseLabel = this.phase ? ` (${this.phase === "research" ? "Research" : "Plan"})` : "";
      this.panel.title = `MVB: ${project.title}${phaseLabel}`;

      this.postMessage({
        type: "loadProject",
        project,
        artifacts,
        connections,
        groups,
        feedback,
        displayPhase: this.phase,
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
        } else {
          // Wizard mode — send startResearchWizard if queued, otherwise send empty one
          if (this.pendingWizardMessage) {
            this.postMessage(this.pendingWizardMessage);
            this.pendingWizardMessage = null;
          } else {
            this.postMessage({
              type: "startResearchWizard",
              topic: "",
              description: "",
              questions: [],
              suggestedName: "",
            });
          }
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

      case "requestResearchClarify":
        try {
          const result = await api.getClarifyingQuestions(msg.topic, msg.description);
          this.postMessage({
            type: "researchClarifyResult",
            questions: result.questions || [],
            suggestedName: result.suggested_name || "",
          });
        } catch (e) {
          console.error("Research clarify failed:", e);
          this.postMessage({ type: "researchClarifyResult", questions: [], suggestedName: "" });
        }
        break;

      case "submitResearch":
        try {
          // Create project if we don't have one yet (wizard mode)
          if (!this.projectId) {
            const project = await api.createProject(msg.projectName, msg.description);
            this.projectId = project.id;
            this.phase = "research";

            // Re-key the panel from "wizard" to the real project key
            CanvasPanel.panels.delete("wizard");
            CanvasPanel.panels.set(this.panelKey, this);

            // Connect WebSocket now that we have a projectId
            this.connectWebSocket(this.projectId);
          }

          // Start research
          await api.startResearch(this.projectId, msg.query, msg.context);
          CanvasPanel.progressTracker?.trackResearch(this.projectId, msg.projectName);

          // Update panel title
          this.panel.title = `MVB: ${msg.projectName} (Research)`;

          // Load project data so the canvas can display
          await this.loadProjectAndFlush();

          this.onRefreshSidebar();
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          vscode.window.showErrorMessage(`Failed to start research: ${errMsg}`);
        }
        break;
    }
  }

  private postMessage(msg: ExtToWebview): void {
    this.panel.webview.postMessage(msg);
  }

  dispose(): void {
    CanvasPanel.panels.delete(this.panelKey);
    this.ws.disconnect();
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}
