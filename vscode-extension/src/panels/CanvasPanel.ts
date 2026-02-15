import * as vscode from "vscode";
import { getWebviewContent } from "./getWebviewContent";
import * as api from "../api/mvpClient";
import { ProjectWebSocket } from "../api/mvpClient";
import type { ExtToWebview, WebviewToExt, WSEvent } from "../types";

export class CanvasPanel {
  public static currentPanel: CanvasPanel | undefined;
  private static readonly viewType = "mvp-canvas";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private projectId: string | undefined;
  private ws: ProjectWebSocket;
  private onRefreshSidebar: () => void;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    onRefreshSidebar: () => void
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.onRefreshSidebar = onRefreshSidebar;
    this.ws = new ProjectWebSocket();

    // Set webview HTML
    this.panel.webview.html = getWebviewContent(this.panel.webview, this.extensionUri);

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
    // If panel exists, show it
    if (CanvasPanel.currentPanel) {
      CanvasPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      CanvasPanel.currentPanel.loadProject(projectId);
      return CanvasPanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      CanvasPanel.viewType,
      "MVB Canvas",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "webview", "dist")],
      }
    );

    CanvasPanel.currentPanel = new CanvasPanel(panel, extensionUri, onRefreshSidebar);
    CanvasPanel.currentPanel.loadProject(projectId);
    return CanvasPanel.currentPanel;
  }

  async loadProject(projectId: string): Promise<void> {
    this.projectId = projectId;
    this.panel.title = "MVB Canvas";

    try {
      const [project, artifacts, connections, groups, feedback] = await Promise.all([
        api.getProject(projectId),
        api.getArtifacts(projectId),
        api.getConnections(projectId),
        api.getGroups(projectId),
        api.getFeedback(projectId),
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

      // Connect WebSocket for real-time updates
      this.connectWebSocket(projectId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Failed to load project: ${msg}`);
    }
  }

  private connectWebSocket(projectId: string): void {
    this.ws.disconnect();
    this.ws.connect(projectId);

    this.ws.onEvent((event: WSEvent) => {
      // Forward all WS events to the webview
      this.postMessage({ type: "wsEvent", event });

      // On completion events, refresh sidebar
      if (
        event.type === "research_complete" ||
        event.type === "plan_complete" ||
        event.type === "batch_regenerate_complete"
      ) {
        this.onRefreshSidebar();
      }
    });
  }

  private async handleWebviewMessage(msg: WebviewToExt): Promise<void> {
    switch (msg.type) {
      case "ready":
        if (this.projectId) {
          await this.loadProject(this.projectId);
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
    }
  }

  private postMessage(msg: ExtToWebview): void {
    this.panel.webview.postMessage(msg);
  }

  dispose(): void {
    CanvasPanel.currentPanel = undefined;
    this.ws.disconnect();
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}
