import { useEffect } from "react";
import { useExtensionStore } from "./stores/extensionStore";
import { sendToExtension, onExtensionMessage } from "./vscodeApi";
import type { ExtToWebview } from "./vscodeApi";
import { ProjectCanvas } from "./components/canvas/ProjectCanvas";
import { ReviewMode } from "./components/review/ReviewMode";
import { ProgressView } from "./components/progress/ProgressView";
import { AnimatePresence } from "framer-motion";

export function App() {
  const project = useExtensionStore((s) => s.project);
  const isResearching = useExtensionStore((s) => s.isResearching);
  const isPlanning = useExtensionStore((s) => s.isPlanning);
  const reviewMode = useExtensionStore((s) => s.reviewMode);
  const setProject = useExtensionStore((s) => s.setProject);
  const handleWSEvent = useExtensionStore((s) => s.handleWSEvent);
  const setFeedback = useExtensionStore((s) => s.setFeedback);

  // Listen for messages from the extension host
  useEffect(() => {
    const cleanup = onExtensionMessage((msg: ExtToWebview) => {
      switch (msg.type) {
        case "loadProject":
          setProject(msg.project, msg.artifacts, msg.connections, msg.groups, msg.feedback);
          break;
        case "wsEvent":
          handleWSEvent(msg.event);
          break;
        case "feedbackUpdated":
          setFeedback(msg.feedback);
          break;
        case "themeChanged":
          document.body.className = msg.kind === "light" ? "vscode-light" : "vscode-dark";
          break;
      }
    });

    // Tell extension we're ready to receive data
    sendToExtension({ type: "ready" });

    return cleanup;
  }, [setProject, handleWSEvent, setFeedback]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-[var(--text-muted)] text-sm font-mono-hud">
            Loading project...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Main canvas view */}
      <ProjectCanvas />

      {/* Progress overlay when researching or planning */}
      {(isResearching || isPlanning) && <ProgressView />}

      {/* Review mode overlay */}
      <AnimatePresence>
        {reviewMode && <ReviewMode />}
      </AnimatePresence>
    </div>
  );
}
