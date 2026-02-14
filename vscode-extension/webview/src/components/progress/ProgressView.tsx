import { useExtensionStore } from "../../stores/extensionStore";
import { motion } from "framer-motion";

export function ProgressView() {
  const agents = useExtensionStore((s) => s.agents);
  const isResearching = useExtensionStore((s) => s.isResearching);
  const isPlanning = useExtensionStore((s) => s.isPlanning);
  const imageGenerationProgress = useExtensionStore((s) => s.imageGenerationProgress);

  const completedCount = agents.filter((a) => a.status === "complete").length;
  const totalCount = agents.length;

  return (
    <motion.div
      className="absolute top-4 right-4 z-30 w-72"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-mono-hud text-[var(--accent-cyan)] uppercase tracking-wider">
            {isResearching ? "Researching" : isPlanning ? "Planning" : "Working"}
          </span>
        </div>

        {/* Agent status cards */}
        {agents.length > 0 && (
          <div className="space-y-2 mb-3">
            {agents.map((agent) => (
              <div
                key={agent.agent_id}
                className={`text-xs p-2 rounded border-l-2 ${
                  agent.status === "complete"
                    ? "border-[var(--accent-green)] bg-[var(--bg-deep)]"
                    : agent.status === "error"
                      ? "border-[var(--accent-red)] bg-[var(--bg-deep)]"
                      : "border-[var(--accent-cyan)] bg-[var(--bg-deep)]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    agent.status === "complete" ? "bg-[var(--accent-green)]"
                    : agent.status === "error" ? "bg-[var(--accent-red)]"
                    : "bg-[var(--accent-cyan)] animate-pulse"
                  }`} />
                  <span className="text-[var(--text-primary)] font-medium truncate">
                    {agent.focus_area || agent.sub_query || `Agent ${agent.agent_id.slice(0, 6)}`}
                  </span>
                </div>
                {agent.thinking && agent.status === "running" && (
                  <p className="text-[var(--text-muted)] mt-1 truncate pl-3.5">
                    {agent.thinking}
                  </p>
                )}
                {agent.artifact_count > 0 && (
                  <p className="text-[var(--text-muted)] pl-3.5 mt-0.5">
                    {agent.artifact_count} artifact{agent.artifact_count > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Overall progress */}
        {totalCount > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] font-mono-hud text-[var(--text-muted)] mb-1">
              <span>Progress</span>
              <span>{completedCount}/{totalCount} agents</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-deep)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--accent-cyan)]"
                initial={{ width: 0 }}
                animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Image generation progress */}
        {imageGenerationProgress && (
          <div>
            <div className="flex justify-between text-[10px] font-mono-hud text-[var(--text-muted)] mb-1">
              <span>Images</span>
              <span>{imageGenerationProgress.completed}/{imageGenerationProgress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-deep)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--accent-purple)]"
                initial={{ width: 0 }}
                animate={{ width: `${imageGenerationProgress.total > 0 ? (imageGenerationProgress.completed / imageGenerationProgress.total) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
