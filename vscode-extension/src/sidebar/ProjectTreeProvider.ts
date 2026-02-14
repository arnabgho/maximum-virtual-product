import * as vscode from "vscode";
import * as api from "../api/mvpClient";
import type { Project, Artifact, Feedback } from "../types";
import {
  ProjectItem,
  PhaseItem,
  ArtifactItem,
  FeedbackSummaryItem,
  ActionsItem,
  ActionCommandItem,
  LoadingItem,
} from "./treeItems";

type TreeNode =
  | ProjectItem
  | PhaseItem
  | ArtifactItem
  | FeedbackSummaryItem
  | ActionsItem
  | ActionCommandItem
  | LoadingItem;

export class ProjectTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projects: Project[] = [];
  private artifactCache = new Map<string, Artifact[]>();
  private feedbackCache = new Map<string, Feedback[]>();
  private loadingProjects = new Set<string>();

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  refreshProject(projectId: string): void {
    this.artifactCache.delete(projectId);
    this.feedbackCache.delete(projectId);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      return this.getRootChildren();
    }

    if (element instanceof ProjectItem) {
      return this.getProjectChildren(element.project);
    }

    if (element instanceof PhaseItem) {
      return this.getPhaseChildren(element.projectId, element.phase);
    }

    if (element instanceof ActionsItem) {
      return this.getActionChildren(element.projectId, element.phase);
    }

    return [];
  }

  private async getRootChildren(): Promise<TreeNode[]> {
    try {
      this.projects = await api.listProjects();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [new LoadingItem(`Error: ${msg}`)];
    }

    if (this.projects.length === 0) {
      return [new LoadingItem("No projects — use + to create one")];
    }

    return this.projects.map((p) => new ProjectItem(p));
  }

  private async getProjectChildren(project: Project): Promise<TreeNode[]> {
    // Load artifacts and feedback in parallel
    if (!this.artifactCache.has(project.id)) {
      try {
        const [artifacts, feedback] = await Promise.all([
          api.getArtifacts(project.id),
          api.getFeedback(project.id),
        ]);
        this.artifactCache.set(project.id, artifacts);
        this.feedbackCache.set(project.id, feedback);
      } catch {
        this.artifactCache.set(project.id, []);
        this.feedbackCache.set(project.id, []);
      }
    }

    const artifacts = this.artifactCache.get(project.id) || [];
    const feedback = this.feedbackCache.get(project.id) || [];

    const researchCount = artifacts.filter((a) => a.phase === "research").length;
    const planCount = artifacts.filter((a) => a.phase === "plan").length;
    const pendingFeedback = feedback.filter((f) => f.status === "pending").length;

    const children: TreeNode[] = [
      new PhaseItem(project.id, "research", researchCount, project.phase === "research"),
      new PhaseItem(project.id, "plan", planCount, project.phase === "plan"),
    ];

    if (feedback.length > 0) {
      children.push(new FeedbackSummaryItem(project.id, pendingFeedback, feedback.length));
    }

    children.push(new ActionsItem(project.id, project.phase));
    return children;
  }

  private async getPhaseChildren(projectId: string, phase: "research" | "plan"): Promise<TreeNode[]> {
    const artifacts = (this.artifactCache.get(projectId) || []).filter((a) => a.phase === phase);
    const feedback = this.feedbackCache.get(projectId) || [];

    if (artifacts.length === 0) {
      return [new LoadingItem(phase === "research" ? "No research yet" : "No plan yet")];
    }

    return artifacts.map((a) => {
      const count = feedback.filter((f) => f.artifact_id === a.id).length;
      return new ArtifactItem(a, count);
    });
  }

  private getActionChildren(projectId: string, phase: "research" | "plan"): TreeNode[] {
    return [
      new ActionCommandItem("Start Research", "mvp.startResearch", [projectId], "search"),
      new ActionCommandItem("Generate Plan", "mvp.generatePlan", [projectId], "note"),
      new ActionCommandItem("Open Canvas", "mvp.openCanvas", [projectId], "preview"),
      new ActionCommandItem("Export Plan", "mvp.exportPlan", [projectId], "export"),
      new ActionCommandItem("Open in Browser", "mvp.openInBrowser", [projectId], "link-external"),
    ];
  }

  // Public accessors for the extension commands
  getProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  getFirstProject(): Project | undefined {
    return this.projects[0];
  }
}
