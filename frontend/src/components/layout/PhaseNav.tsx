import { useProjectStore } from "../../stores/projectStore";
import type { Phase } from "../../types";

export function PhaseNav() {
  const { project, setPhase, artifacts } = useProjectStore();
  if (!project) return null;

  const researchCount = artifacts.filter((a) => a.phase === "research").length;
  const planCount = artifacts.filter((a) => a.phase === "plan").length;

  const phases: { key: Phase; label: string; count: number }[] = [
    { key: "research", label: "Research", count: researchCount },
    { key: "plan", label: "Plan", count: planCount },
  ];

  return (
    <header className="h-12 border-b border-[#3a3a4e] bg-[#1e1e2e] flex items-center px-4 gap-4">
      <span className="text-sm font-semibold text-white mr-4">{project.title}</span>
      <nav className="flex gap-1">
        {phases.map((p) => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              project.phase === p.key
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-[#2a2a3e]"
            }`}
          >
            {p.label}
            {p.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({p.count})</span>
            )}
          </button>
        ))}
      </nav>
    </header>
  );
}
