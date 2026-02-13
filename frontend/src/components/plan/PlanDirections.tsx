import { useProjectStore } from "../../stores/projectStore";

export function PlanDirections() {
  const {
    isPlanning,
    planDescription,
    artifacts,
    planStages,
    imageGenerationProgress,
    setShowPlanWizard,
  } = useProjectStore();

  const hasPlanArtifacts = artifacts.some((a) => a.phase === "plan");

  // Planning in progress — show real progress
  if (isPlanning) {
    const artifactCount = planStages.filter((s) => s.detail !== "connection" && s.id !== "images").length;
    const connectionCount = planStages.filter((s) => s.detail === "connection").length;
    const imageStage = planStages.find((s) => s.id === "images");

    let stageLabel = "Generating components...";
    if (imageStage) {
      stageLabel = imageStage.status === "complete" ? "Finalizing..." : `Generating images ${imageStage.detail || ""}`;
    } else if (connectionCount > 0) {
      stageLabel = "Creating connections...";
    } else if (artifactCount > 0) {
      stageLabel = "Generating components...";
    }

    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-green)]/10 border border-[var(--accent-cyan)]/20 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)]/5 to-[var(--accent-green)]/5 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[var(--accent-cyan)] font-mono-hud uppercase tracking-wider">Generating Blueprint</p>
              <p className="text-sm text-white truncate">{planDescription}</p>
            </div>
          </div>

          {/* Real progress stats */}
          <div className="relative mt-3 flex items-center gap-3 text-[10px] font-mono-hud uppercase tracking-wider text-[var(--text-muted)]">
            {artifactCount > 0 && <span>{artifactCount} components</span>}
            {connectionCount > 0 && <span>{connectionCount} links</span>}
            {imageGenerationProgress && (
              <span>{imageGenerationProgress.completed}/{imageGenerationProgress.total} images</span>
            )}
          </div>

          {/* Stage label */}
          <p className="relative mt-1.5 text-[11px] text-[var(--accent-cyan)]/70 font-mono-hud">{stageLabel}</p>

          {/* Progress bar */}
          {imageGenerationProgress ? (
            <div className="relative mt-2 h-1 rounded-full bg-[var(--bg-deep)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(imageGenerationProgress.completed / imageGenerationProgress.total) * 100}%`,
                  background: "linear-gradient(90deg, #00e5ff, #7c3aed)",
                }}
              />
            </div>
          ) : (
            <div className="relative mt-2 h-1 rounded-full bg-[var(--bg-deep)] overflow-hidden">
              <div className="h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%", background: "linear-gradient(90deg, #00e5ff, #7c3aed)" }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Plan artifacts exist — nothing to show (artifacts are listed by Sidebar)
  if (hasPlanArtifacts) {
    return (
      <button
        onClick={() => setShowPlanWizard(true)}
        className="w-full py-2.5 rounded-lg border border-dashed border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]/30 transition-all font-mono-hud text-xs uppercase tracking-wider"
      >
        + New Blueprint
      </button>
    );
  }

  // No plan artifacts, not planning — show "Open Plan Wizard" button
  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowPlanWizard(true)}
        className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
      >
        Open Plan Wizard
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="text-xs text-[var(--text-muted)] text-center font-mono-hud">
        Configure direction, design preferences, and scope
      </p>
    </div>
  );
}
