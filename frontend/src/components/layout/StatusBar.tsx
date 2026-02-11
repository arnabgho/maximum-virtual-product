import { useProjectStore } from "../../stores/projectStore";
import { AgentProgress } from "../research/AgentProgress";

export function StatusBar() {
  const { agents, isResearching, isPlanning } = useProjectStore();
  const activeAgents = agents.filter((a) => a.status === "running");

  if (!isResearching && !isPlanning && activeAgents.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#1e1e2e]/95 backdrop-blur border-t border-[#3a3a4e] px-4 py-2">
      {isResearching && (
        <div className="flex items-center gap-2 text-sm text-indigo-300">
          <span className="animate-pulse w-2 h-2 rounded-full bg-indigo-500" />
          Researching...
        </div>
      )}
      {isPlanning && (
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500" />
          Planning...
        </div>
      )}
      <AgentProgress />
    </div>
  );
}
