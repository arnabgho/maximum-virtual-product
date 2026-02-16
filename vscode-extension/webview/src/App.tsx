import { useEffect } from "react";
import { useExtensionStore } from "./stores/extensionStore";
import { sendToExtension, onExtensionMessage } from "./vscodeApi";
import type { ExtToWebview } from "./vscodeApi";
import { ProjectCanvas } from "./components/canvas/ProjectCanvas";
import { ReviewMode } from "./components/review/ReviewMode";
import { ProgressView } from "./components/progress/ProgressView";
import { PlanWizardModal } from "./components/wizard/PlanWizardModal";
import { ResearchWizardModal } from "./components/wizard/ResearchWizardModal";
import { AnimatePresence } from "framer-motion";

export function App() {
  const project = useExtensionStore((s) => s.project);
  const isResearching = useExtensionStore((s) => s.isResearching);
  const isPlanning = useExtensionStore((s) => s.isPlanning);
  const reviewMode = useExtensionStore((s) => s.reviewMode);
  const showPlanWizard = useExtensionStore((s) => s.showPlanWizard);
  const showResearchWizard = useExtensionStore((s) => s.showResearchWizard);
  const setProject = useExtensionStore((s) => s.setProject);
  const handleWSEvent = useExtensionStore((s) => s.handleWSEvent);
  const setFeedback = useExtensionStore((s) => s.setFeedback);

  // Listen for messages from the extension host
  useEffect(() => {
    const cleanup = onExtensionMessage((msg: ExtToWebview) => {
      switch (msg.type) {
        case "loadProject":
          setProject(msg.project, msg.artifacts, msg.connections, msg.groups, msg.feedback, msg.displayPhase);
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
        case "startPlanWizard":
          useExtensionStore.getState().setPlanDirections(msg.directions);
          useExtensionStore.getState().setShowPlanWizard(true);
          break;
        case "designPreferencesResult":
          useExtensionStore.getState().setDesignDimensions(msg.dimensions);
          break;
        case "planClarifyResult":
          useExtensionStore.getState().setPlanClarifyingQuestions(msg.questions);
          break;
        case "startResearchWizard": {
          const store = useExtensionStore.getState();
          store.setResearchTopic(msg.topic || "");
          store.setResearchDescription(msg.description || "");
          store.setResearchClarifyingQuestions(msg.questions, msg.suggestedName);
          store.setShowResearchWizard(true);
          break;
        }
        case "researchClarifyResult": {
          const store = useExtensionStore.getState();
          store.setResearchClarifyingQuestions(msg.questions, msg.suggestedName);
          break;
        }
      }
    });

    // Tell extension we're ready to receive data
    sendToExtension({ type: "ready" });

    return cleanup;
  }, [setProject, handleWSEvent, setFeedback]);

  // When no project loaded: show wizard if active, otherwise loading text
  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        {showResearchWizard ? (
          <AnimatePresence>
            <ResearchWizardModal />
          </AnimatePresence>
        ) : (
          <div className="text-center">
            <div className="text-[var(--text-muted)] text-sm font-mono-hud">
              Loading project...
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Main canvas view */}
      <ProjectCanvas />

      {/* Progress overlay when researching or planning */}
      {(isResearching || isPlanning) && <ProgressView />}

      {/* Plan wizard overlay */}
      <AnimatePresence>
        {showPlanWizard && <PlanWizardModal />}
      </AnimatePresence>

      {/* Research wizard overlay */}
      <AnimatePresence>
        {showResearchWizard && <ResearchWizardModal />}
      </AnimatePresence>

      {/* Review mode overlay */}
      <AnimatePresence>
        {reviewMode && <ReviewMode />}
      </AnimatePresence>
    </div>
  );
}
