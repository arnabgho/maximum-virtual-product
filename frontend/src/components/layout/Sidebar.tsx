import { useProjectStore } from "../../stores/projectStore";
import { ResearchInput } from "../research/ResearchInput";
import { PlanDirections } from "../plan/PlanDirections";
import { VideoExport } from "../research/VideoExport";

export function Sidebar() {
  const { project, artifacts, setSelectedArtifact, selectedArtifactId } = useProjectStore();
  if (!project) return null;

  const phaseArtifacts = artifacts.filter((a) => a.phase === project.phase);

  return (
    <aside className="w-72 border-r border-[var(--border-dim)] bg-[var(--bg-surface)] flex flex-col">
      <div className="p-3 border-b border-[var(--border-dim)]">
        {project.phase === "research" ? <ResearchInput /> : <PlanDirections />}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="font-mono-hud text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2 mb-2">
          Artifacts ({phaseArtifacts.length})
        </h3>
        {phaseArtifacts.map((artifact) => (
          <button
            key={artifact.id}
            onClick={() => setSelectedArtifact(artifact.id)}
            className={`w-full text-left p-2.5 rounded-lg text-sm mb-1 transition-all ${
              selectedArtifactId === artifact.id
                ? "bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-transparent"
            }`}
          >
            <div className="font-medium truncate text-[var(--text-primary)]">{artifact.title}</div>
            <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{artifact.summary}</div>
            <div className="font-mono-hud text-[10px] text-[var(--text-muted)] mt-0.5">{artifact.id}</div>
          </button>
        ))}
        {phaseArtifacts.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] px-2 font-mono-hud uppercase tracking-wider">
            No artifacts. Start {project.phase === "research" ? "researching" : "planning"} to generate.
          </p>
        )}
      </div>
      {phaseArtifacts.length > 0 && <VideoExport phase={project.phase} />}
    </aside>
  );
}
