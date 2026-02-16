import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ProjectTreeProvider } from "./sidebar/ProjectTreeProvider";
import { CanvasPanel } from "./panels/CanvasPanel";
import * as api from "./api/mvpClient";
import { initAuth, signIn, signOut, isSignedIn, onDidSignIn, onDidSignOut } from "./auth";
import type { PlanDirection } from "./types";
import { ProgressTracker } from "./services/ProgressTracker";

export function activate(context: vscode.ExtensionContext) {
  // Initialize auth with SecretStorage
  initAuth(context.secrets);

  const treeProvider = new ProjectTreeProvider();
  const treeView = vscode.window.createTreeView("mvp-projects", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Refresh tree when auth state changes
  context.subscriptions.push(onDidSignIn(() => treeProvider.refresh()));
  context.subscriptions.push(onDidSignOut(() => treeProvider.refresh()));

  // Progress tracker for long-running operations
  const progressTracker = new ProgressTracker();
  context.subscriptions.push(progressTracker.onDidChange(() => treeProvider.refresh()));
  context.subscriptions.push({ dispose: () => progressTracker.dispose() });
  treeProvider.setProgressTracker(progressTracker);

  // Helper to resolve projectId from command arguments or prompt user
  async function resolveProjectId(projectId?: string): Promise<string | undefined> {
    if (projectId) return projectId;

    // Try to pick from the tree view selection
    try {
      const projects = await api.listProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage("No projects found. Create one first.");
        return undefined;
      }
      if (projects.length === 1) return projects[0].id;

      const picked = await vscode.window.showQuickPick(
        projects.map((p) => ({
          label: p.title,
          description: p.phase,
          detail: p.id,
        })),
        { placeHolder: "Select a project" }
      );
      return picked?.detail;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Failed to list projects: ${msg}`);
      return undefined;
    }
  }

  // --- mvp.signIn ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.signIn", async () => {
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "Signing in with GitHub..." },
          () => signIn()
        );
        vscode.window.showInformationMessage("Signed in to MVB.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Sign-in failed: ${msg}`);
      }
    })
  );

  // --- mvp.signOut ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.signOut", async () => {
      await signOut();
      vscode.window.showInformationMessage("Signed out of MVB.");
    })
  );

  // --- mvp.refresh ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.refresh", () => {
      treeProvider.refresh();
    })
  );

  // --- mvp.createProject ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.createProject", async () => {
      const title = await vscode.window.showInputBox({
        prompt: "Project title / research topic",
        placeHolder: "e.g. AI Code Review Tool",
      });
      if (!title) return;

      const description = await vscode.window.showInputBox({
        prompt: "What do you want to build? (optional)",
        placeHolder: "A tool that automatically reviews pull requests using AI...",
      });

      try {
        const project = await api.createProject(title, description || "");
        vscode.window.showInformationMessage(`Project created: ${project.title}`);
        treeProvider.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Failed to create project: ${msg}`);
      }
    })
  );

  // --- mvp.startResearch ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.startResearch", async (projectId?: string) => {
      const id = await resolveProjectId(projectId);
      if (!id) return;

      const query = await vscode.window.showInputBox({
        prompt: "Research query",
        placeHolder: "What would you like to research?",
      });
      if (!query) return;

      // Optionally get clarifying questions
      let researchContext: Record<string, string> = {};
      try {
        const clarify = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "Getting clarifying questions..." },
          () => api.getClarifyingQuestions(query)
        );

        if (clarify.questions.length > 0) {
          for (const q of clarify.questions) {
            const answer = await vscode.window.showQuickPick(
              [...q.options, "Skip"],
              { placeHolder: q.question }
            );
            if (answer && answer !== "Skip") {
              researchContext[q.question] = answer;
            }
          }
        }
      } catch {
        // Proceed without clarifying questions
      }

      // Start research with progress tracking
      try {
        // Fetch project title for progress display
        let projectTitle = "Research";
        try {
          const project = await api.getProject(id);
          projectTitle = project.title;
        } catch { /* use default */ }

        await api.startResearch(id, query, researchContext);
        progressTracker.trackResearch(id, projectTitle);
        // Open canvas to show streaming progress
        CanvasPanel.createOrShow(
          context.extensionUri,
          id,
          () => treeProvider.refreshProject(id)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Failed to start research: ${msg}`);
      }
    })
  );

  // --- mvp.generatePlan ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.generatePlan", async (projectId?: string) => {
      const id = await resolveProjectId(projectId);
      if (!id) return;

      // Get plan directions
      let directions: PlanDirection[] = [];
      try {
        directions = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "Getting plan directions..." },
          () => api.getPlanDirections(id)
        );
      } catch {
        // Continue without directions
      }

      let description = "";
      if (directions.length > 0) {
        const picked = await vscode.window.showQuickPick(
          directions.map((d) => ({
            label: d.title,
            description: d.key_focus,
            detail: d.description,
          })),
          { placeHolder: "Choose a strategic direction" }
        );
        if (picked) {
          description = `${picked.label}: ${picked.detail}`;
        }
      }

      if (!description) {
        const input = await vscode.window.showInputBox({
          prompt: "Plan description",
          placeHolder: "Describe what to build...",
        });
        if (!input) return;
        description = input;
      }

      try {
        // Fetch project title for progress display
        let projectTitle = "Plan";
        try {
          const project = await api.getProject(id);
          projectTitle = project.title;
        } catch { /* use default */ }

        await api.startPlan(id, description);
        progressTracker.trackPlan(id, projectTitle);
        CanvasPanel.createOrShow(
          context.extensionUri,
          id,
          () => treeProvider.refreshProject(id)
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Failed to generate plan: ${msg}`);
      }
    })
  );

  // --- mvp.openCanvas ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.openCanvas", async (projectId?: string) => {
      const id = await resolveProjectId(projectId);
      if (!id) return;

      CanvasPanel.createOrShow(
        context.extensionUri,
        id,
        () => treeProvider.refreshProject(id)
      );
    })
  );

  // --- mvp.exportPlan ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.exportPlan", async (projectId?: string) => {
      const id = await resolveProjectId(projectId);
      if (!id) return;

      try {
        const markdown = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: "Exporting plan..." },
          () => api.exportPlan(id)
        );

        // Write to workspace root or prompt for location
        let targetPath: string;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          targetPath = path.join(workspaceFolders[0].uri.fsPath, "PLAN.md");
        } else {
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file("PLAN.md"),
            filters: { Markdown: ["md"] },
          });
          if (!uri) return;
          targetPath = uri.fsPath;
        }

        fs.writeFileSync(targetPath, markdown, "utf-8");

        // Open the file
        const doc = await vscode.workspace.openTextDocument(targetPath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Plan exported to ${path.basename(targetPath)}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Failed to export plan: ${msg}`);
      }
    })
  );

  // --- mvp.openInBrowser ---
  context.subscriptions.push(
    vscode.commands.registerCommand("mvp.openInBrowser", async (projectId?: string) => {
      const id = await resolveProjectId(projectId);
      if (!id) return;

      const frontendUrl = vscode.workspace.getConfiguration("mvp").get<string>("frontendUrl", "http://localhost:5173");
      const url = `${frontendUrl}?project=${id}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}

export function deactivate() {
  CanvasPanel.disposeAll();
}
