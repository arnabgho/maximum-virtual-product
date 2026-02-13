import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { PhaseNav } from "./PhaseNav";
import { Sidebar } from "./Sidebar";
import { FloatingProgress } from "./FloatingProgress";
import { ProjectCanvas } from "../canvas/ProjectCanvas";
import { ArtifactDetail } from "../artifacts/ArtifactDetail";
import { PlanWizardModal } from "../plan/PlanWizardModal";
import { ResearchWizardModal } from "../research/ResearchWizardModal";
import { ReviewMode } from "../review/ReviewMode";
import { useProjectStore } from "../../stores/projectStore";
import { useWebSocket } from "../../hooks/useWebSocket";

export function AppShell() {
  const { project, artifacts, showPlanWizard, setShowPlanWizard, reviewMode } = useProjectStore();
  useWebSocket(project?.id ?? null);

  // Auto-open plan wizard when entering plan phase with no plan artifacts
  const prevPhaseRef = useRef(project?.phase);
  useEffect(() => {
    const currentPhase = project?.phase;
    if (currentPhase === "plan" && prevPhaseRef.current !== "plan") {
      const hasPlanArtifacts = artifacts.some((a) => a.phase === "plan");
      if (!hasPlanArtifacts) {
        setShowPlanWizard(true);
      }
    }
    prevPhaseRef.current = currentPhase;
  }, [project?.phase, artifacts, setShowPlanWizard]);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-deep)]">
      <PhaseNav />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <ProjectCanvas />
        </main>
      </div>
      <ArtifactDetail />
      <FloatingProgress />
      {showPlanWizard && <PlanWizardModal />}
      <ResearchWizardModal />
      <AnimatePresence>{reviewMode && <ReviewMode />}</AnimatePresence>
    </div>
  );
}
