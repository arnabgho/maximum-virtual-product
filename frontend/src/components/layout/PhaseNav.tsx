import { useProjectStore } from "../../stores/projectStore";
import type { Phase } from "../../types";

export function PhaseNav() {
  const { project, setPhase, artifacts, isResearching, planDirections, reset } = useProjectStore();
  if (!project) return null;

  const researchCount = artifacts.filter((a) => a.phase === "research").length;
  const planCount = artifacts.filter((a) => a.phase === "plan").length;

  // Plan tab is locked until research has produced artifacts
  const planLocked = researchCount === 0;
  // Pulse the Plan tab when directions just arrived and user is still on research
  const planReady = planDirections.length > 0 && project.phase === "research" && !isResearching;

  const phases: { key: Phase; label: string; count: number; locked: boolean }[] = [
    { key: "research", label: "Research", count: researchCount, locked: false },
    { key: "plan", label: "Plan", count: planCount, locked: planLocked },
  ];

  return (
    <header className="h-12 border-b border-[#3a3a4e] bg-[#1e1e2e] flex items-center px-4 gap-4">
      <button
        onClick={() => reset()}
        className="text-zinc-400 hover:text-white transition-colors"
        title="Back to projects"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span className="text-sm font-semibold text-white mr-4">{project.title}</span>
      <nav className="flex gap-1">
        {phases.map((p) => {
          if (p.locked) {
            return (
              <span
                key={p.key}
                className="px-3 py-1.5 rounded text-sm font-medium text-zinc-600 cursor-not-allowed flex items-center gap-1.5"
                title="Complete research first"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {p.label}
              </span>
            );
          }

          const isActive = project.phase === p.key;
          const isPlanGlow = p.key === "plan" && planReady && !isActive;

          return (
            <button
              key={p.key}
              onClick={() => setPhase(p.key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : isPlanGlow
                    ? "text-emerald-400 bg-emerald-600/10 hover:bg-emerald-600/20 animate-pulse"
                    : "text-zinc-400 hover:text-white hover:bg-[#2a2a3e]"
              }`}
            >
              {p.label}
              {p.count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({p.count})</span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
