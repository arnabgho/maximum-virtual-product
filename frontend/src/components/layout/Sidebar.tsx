import { useProjectStore } from "../../stores/projectStore";
import { ResearchInput } from "../research/ResearchInput";
import { PlanDirections } from "../plan/PlanDirections";
import { VideoExport } from "../research/VideoExport";

export function Sidebar() {
  const { project, artifacts, setSelectedArtifact, selectedArtifactId } = useProjectStore();
  if (!project) return null;

  const phaseArtifacts = artifacts.filter((a) => a.phase === project.phase);

  return (
    <aside className="w-72 border-r border-[#3a3a4e] bg-[#1a1a2e] flex flex-col">
      <div className="p-3 border-b border-[#3a3a4e]">
        {project.phase === "research" ? <ResearchInput /> : <PlanDirections />}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">
          Artifacts ({phaseArtifacts.length})
        </h3>
        {phaseArtifacts.map((artifact) => (
          <button
            key={artifact.id}
            onClick={() => setSelectedArtifact(artifact.id)}
            className={`w-full text-left p-2 rounded text-sm mb-1 transition-colors ${
              selectedArtifactId === artifact.id
                ? "bg-indigo-600/20 text-indigo-300"
                : "text-zinc-300 hover:bg-[#2a2a3e]"
            }`}
          >
            <div className="font-medium truncate">{artifact.title}</div>
            <div className="text-xs text-zinc-500 truncate mt-0.5">{artifact.summary}</div>
            <div className="text-xs text-zinc-600 font-mono mt-0.5">{artifact.id}</div>
          </button>
        ))}
        {phaseArtifacts.length === 0 && (
          <p className="text-xs text-zinc-600 px-2">
            No artifacts yet. Start {project.phase === "research" ? "researching" : "planning"} to generate artifacts.
          </p>
        )}
      </div>
      {phaseArtifacts.length > 0 && <VideoExport phase={project.phase} />}
    </aside>
  );
}
