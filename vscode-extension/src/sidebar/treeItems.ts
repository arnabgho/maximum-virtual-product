import * as vscode from "vscode";
import type { Project, Artifact, Feedback } from "../types";
import type { TrackedOperation } from "../services/ProgressTracker";

export class ProjectItem extends vscode.TreeItem {
  constructor(public readonly project: Project, activeOp?: TrackedOperation) {
    super(project.title, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "project";

    if (activeOp) {
      this.iconPath = new vscode.ThemeIcon("loading~spin");
      this.description = activeOp.lastMessage;
      this.tooltip = `${project.title}\n${activeOp.lastMessage}\nID: ${project.id}`;
    } else {
      this.description = project.phase;
      this.iconPath = new vscode.ThemeIcon("folder");
      this.tooltip = `${project.title}\nPhase: ${project.phase}\nID: ${project.id}`;
    }
  }
}

export class PhaseItem extends vscode.TreeItem {
  constructor(
    public readonly projectId: string,
    public readonly phase: "research" | "plan",
    public readonly artifactCount: number,
    public readonly isCurrentPhase: boolean
  ) {
    const label = phase === "research" ? "Research" : "Plan";
    super(label, artifactCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.description = artifactCount > 0 ? `${artifactCount} artifacts` : "empty";
    this.contextValue = phase === "research" ? "project-research" : "project-plan";
    this.iconPath = new vscode.ThemeIcon(
      phase === "research" ? "search" : "note",
      isCurrentPhase ? new vscode.ThemeColor("charts.green") : undefined
    );
    this.command = {
      command: "mvp.openCanvas",
      title: "Open Canvas",
      arguments: [projectId, phase],
    };
  }
}

export class ArtifactItem extends vscode.TreeItem {
  constructor(public readonly artifact: Artifact, feedbackCount: number) {
    super(artifact.title, vscode.TreeItemCollapsibleState.None);
    this.description = artifact.id;
    this.contextValue = "artifact";
    this.iconPath = new vscode.ThemeIcon(getArtifactIcon(artifact.type));
    this.tooltip = `${artifact.title}\nType: ${artifact.type}\nImportance: ${artifact.importance}/100\nID: ${artifact.id}`;

    if (feedbackCount > 0) {
      this.description = `${artifact.id} (${feedbackCount} comments)`;
    }

    this.command = {
      command: "mvp.openCanvas",
      title: "Open Canvas",
      arguments: [artifact.project_id, artifact.phase],
    };
  }
}

export class FeedbackSummaryItem extends vscode.TreeItem {
  constructor(
    public readonly projectId: string,
    public readonly pendingCount: number,
    public readonly totalCount: number
  ) {
    super("Feedback", vscode.TreeItemCollapsibleState.None);
    this.description = pendingCount > 0 ? `${pendingCount} pending` : `${totalCount} total`;
    this.iconPath = new vscode.ThemeIcon(
      "comment-discussion",
      pendingCount > 0 ? new vscode.ThemeColor("charts.yellow") : undefined
    );
    this.contextValue = "feedback-summary";
  }
}

export class ActionsItem extends vscode.TreeItem {
  constructor(
    public readonly projectId: string,
    public readonly phase: "research" | "plan"
  ) {
    super("Actions", vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("zap");
    this.contextValue = "actions";
  }
}

export class ActionCommandItem extends vscode.TreeItem {
  constructor(label: string, commandId: string, args: unknown[], icon: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.command = { command: commandId, title: label, arguments: args };
  }
}

export class LoadingItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("loading~spin");
  }
}

function getArtifactIcon(type: string): string {
  switch (type) {
    case "research_finding": return "search";
    case "competitor": return "shield";
    case "plan_component": return "extensions";
    case "ui_screen": return "browser";
    case "markdown": return "markdown";
    case "mermaid": return "graph";
    case "image": return "file-media";
    case "video": return "play-circle";
    default: return "file";
  }
}
