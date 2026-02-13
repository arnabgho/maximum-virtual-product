import { useProjectStore } from "../../stores/projectStore";

export function ResearchInput() {
  const { isResearching, researchQuery, setShowResearchWizard } = useProjectStore();

  if (isResearching) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)]/5 to-[var(--accent-cyan)]/3 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--accent-cyan)]">Researching</p>
              <p className="text-sm text-white truncate">{researchQuery}</p>
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full bg-[var(--bg-deep)] overflow-hidden">
            <div className="h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%", background: "linear-gradient(90deg, #00e5ff, #7c3aed)" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowResearchWizard(true)}
        className="w-full py-3 hud-btn-primary rounded-lg font-mono-hud text-xs uppercase tracking-wider flex items-center justify-center gap-2"
      >
        + New Research
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
