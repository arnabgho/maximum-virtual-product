import { useProjectStore } from "../../stores/projectStore";

export function AgentProgress() {
  const { agents } = useProjectStore();

  if (agents.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-1">
      {agents.map((agent) => (
        <div key={agent.agent_id} className="flex items-center gap-2 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              agent.status === "running"
                ? "bg-yellow-500 animate-pulse"
                : agent.status === "complete"
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-zinc-400">{agent.focus_area || agent.agent_id}</span>
          {agent.thinking && (
            <span className="text-zinc-600 truncate max-w-48">{agent.thinking}</span>
          )}
          {agent.status === "complete" && (
            <span className="text-zinc-600">({agent.artifact_count} findings)</span>
          )}
        </div>
      ))}
    </div>
  );
}
