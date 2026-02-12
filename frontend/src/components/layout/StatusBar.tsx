import { useProjectStore } from "../../stores/projectStore";

function PhaseIndicator({ label, color }: { label: string; color: "indigo" | "emerald" }) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      text: "text-indigo-300",
      dot: "bg-indigo-500",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-300",
      dot: "bg-emerald-500",
    },
  };
  const c = colorMap[color];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} border ${c.border}`}>
      <span className={`animate-pulse w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-xs font-medium ${c.text}`}>{label}</span>
    </div>
  );
}

export function StatusBar() {
  const { agents, isResearching, isPlanning, imageGenerationProgress } = useProjectStore();
  const activeAgents = agents.filter((a) => a.status === "running");

  if (!isResearching && !isPlanning && activeAgents.length === 0) return null;

  // Determine current phase label
  const getPhaseLabel = () => {
    if (imageGenerationProgress) {
      const { completed, total } = imageGenerationProgress;
      if (completed < total) {
        return `Generating images: ${completed}/${total}`;
      }
    }
    if (activeAgents.length > 0) {
      return `Running ${activeAgents.length} agent${activeAgents.length > 1 ? "s" : ""}...`;
    }
    if (isResearching) return "Planning research angles...";
    if (isPlanning) return "Generating blueprint...";
    return "";
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#1e1e2e]/95 backdrop-blur border-t border-[#3a3a4e] px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        {isResearching && <PhaseIndicator label="Research" color="indigo" />}
        {isPlanning && <PhaseIndicator label="Blueprint" color="emerald" />}
        <span className="text-xs text-zinc-500">{getPhaseLabel()}</span>
      </div>

      {/* Agent progress cards */}
      {agents.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                agent.status === "running"
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : agent.status === "complete"
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <span
                className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                  agent.status === "running"
                    ? "bg-yellow-500 animate-pulse"
                    : agent.status === "complete"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span className="text-zinc-300 truncate font-medium">
                {agent.focus_area || agent.agent_id}
              </span>
              {agent.thinking && (
                <span className="text-zinc-600 truncate ml-auto max-w-32">{agent.thinking}</span>
              )}
              {agent.status === "complete" && (
                <span className="text-zinc-500 ml-auto">{agent.artifact_count} found</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image generation progress */}
      {imageGenerationProgress && imageGenerationProgress.completed < imageGenerationProgress.total && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>Generating images</span>
            <span>{imageGenerationProgress.completed}/{imageGenerationProgress.total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
              style={{ width: `${(imageGenerationProgress.completed / imageGenerationProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
