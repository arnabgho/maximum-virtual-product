import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useProjectStore } from "../../stores/projectStore";

export function FloatingProgress() {
  const {
    agents,
    isResearching,
    isPlanning,
    researchQuery,
    planDescription,
    imageGenerationProgress,
  } = useProjectStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeAgents = agents.filter((a) => a.status === "running");
  const hasImageProgress =
    imageGenerationProgress !== null &&
    imageGenerationProgress.completed < imageGenerationProgress.total;
  const isActive =
    isResearching || isPlanning || activeAgents.length > 0 || hasImageProgress;

  // Auto-expand when activity starts
  useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActive]);

  if (!isActive && agents.length === 0) return null;

  const phaseLabel = isResearching
    ? "Researching"
    : isPlanning
      ? "Planning"
      : "Processing";
  const phaseQuery = isResearching
    ? researchQuery
    : isPlanning
      ? planDescription
      : "";
  const phaseColor = isResearching ? "indigo" : "emerald";

  const indicator = (
    <AnimatePresence>
      {(isActive || agents.length > 0) && (
        <motion.div
          className="fixed z-[100]"
          style={{ top: 16, right: 16 }}
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {isExpanded ? (
            <ExpandedCard
              phaseLabel={phaseLabel}
              phaseQuery={phaseQuery}
              phaseColor={phaseColor}
              agents={agents}
              imageGenerationProgress={imageGenerationProgress}
              hasImageProgress={hasImageProgress}
              isActive={isActive}
              onCollapse={() => setIsExpanded(false)}
            />
          ) : (
            <CollapsedCircle
              activeCount={activeAgents.length}
              isActive={isActive}
              onExpand={() => setIsExpanded(true)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(indicator, document.body);
}

function CollapsedCircle({
  activeCount,
  isActive,
  onExpand,
}: {
  activeCount: number;
  isActive: boolean;
  onExpand: () => void;
}) {
  return (
    <motion.button
      className="relative w-14 h-14 rounded-full backdrop-blur-xl border cursor-pointer"
      style={{
        backgroundColor: "rgba(15, 15, 26, 0.95)",
        borderColor: "rgba(99, 102, 241, 0.4)",
        boxShadow: "0 0 24px rgba(99, 102, 241, 0.2)",
      }}
      onClick={onExpand}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      {/* Outer spinning ring */}
      {isActive && (
        <>
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: "2px solid transparent",
              borderTopColor: "#818cf8",
              animationDuration: "2s",
            }}
          />
          <div
            className="absolute inset-1 rounded-full animate-spin"
            style={{
              border: "2px solid transparent",
              borderBottomColor: "#6366f1",
              animationDuration: "3s",
              animationDirection: "reverse",
            }}
          />
        </>
      )}
      {/* Center dot */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className={`w-3 h-3 rounded-full ${isActive ? "animate-pulse" : ""}`}
          style={{ backgroundColor: isActive ? "#818cf8" : "#4b5563" }}
        />
      </div>
      {/* Badge */}
      {activeCount > 0 && (
        <div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: "#6366f1" }}
        >
          {activeCount}
        </div>
      )}
    </motion.button>
  );
}

function ExpandedCard({
  phaseLabel,
  phaseQuery,
  phaseColor,
  agents,
  imageGenerationProgress,
  hasImageProgress,
  isActive,
  onCollapse,
}: {
  phaseLabel: string;
  phaseQuery: string;
  phaseColor: "indigo" | "emerald";
  agents: { agent_id: string; focus_area: string; status: string; thinking?: string; artifact_count?: number }[];
  imageGenerationProgress: { total: number; completed: number } | null;
  hasImageProgress: boolean;
  isActive: boolean;
  onCollapse: () => void;
}) {
  const colors = {
    indigo: {
      badge: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
      dot: "#818cf8",
    },
    emerald: {
      badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
      dot: "#34d399",
    },
  };
  const c = colors[phaseColor];

  return (
    <motion.div
      className="w-80 backdrop-blur-xl rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: "rgba(15, 15, 26, 0.95)",
        borderColor: "rgba(99, 102, 241, 0.3)",
        boxShadow: "0 4px 40px rgba(99, 102, 241, 0.15)",
      }}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onCollapse}
      >
        {/* Spinning indicator */}
        <div className="relative w-6 h-6 flex-shrink-0">
          {isActive && (
            <>
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: "2px solid transparent",
                  borderTopColor: c.dot,
                  animationDuration: "2s",
                }}
              />
              <div
                className="absolute inset-0.5 rounded-full animate-spin"
                style={{
                  border: "1.5px solid transparent",
                  borderBottomColor: c.dot,
                  animationDuration: "3s",
                  animationDirection: "reverse",
                }}
              />
            </>
          )}
          {!isActive && (
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}
            >
              {phaseLabel}
            </span>
          </div>
          {phaseQuery && (
            <p className="text-xs text-zinc-400 truncate mt-1">{phaseQuery}</p>
          )}
        </div>
        {/* Collapse button */}
        <button
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onCollapse();
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Agent cards */}
      {agents.length > 0 && (
        <div className="px-3 pb-2 space-y-1.5 max-h-52 overflow-y-auto">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                backgroundColor:
                  agent.status === "running"
                    ? "rgba(234, 179, 8, 0.06)"
                    : agent.status === "complete"
                      ? "rgba(34, 197, 94, 0.06)"
                      : "rgba(239, 68, 68, 0.06)",
                border: `1px solid ${
                  agent.status === "running"
                    ? "rgba(234, 179, 8, 0.15)"
                    : agent.status === "complete"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(239, 68, 68, 0.15)"
                }`,
              }}
            >
              <span
                className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                  agent.status === "running"
                    ? "bg-yellow-500 animate-pulse"
                    : agent.status === "complete"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="text-zinc-300 font-medium block truncate">
                  {agent.focus_area || agent.agent_id}
                </span>
                {agent.thinking && agent.status === "running" && (
                  <span className="text-zinc-600 block truncate mt-0.5">
                    {agent.thinking}
                  </span>
                )}
                {agent.status === "complete" && agent.artifact_count != null && (
                  <span className="text-zinc-500 block mt-0.5">
                    {agent.artifact_count} artifact{agent.artifact_count !== 1 ? "s" : ""} found
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image generation progress */}
      {hasImageProgress && imageGenerationProgress && (
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
            <span>Generating images</span>
            <span className="tabular-nums">
              {imageGenerationProgress.completed}/{imageGenerationProgress.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #8b5cf6, #d946ef)",
              }}
              initial={{ width: 0 }}
              animate={{
                width: `${(imageGenerationProgress.completed / imageGenerationProgress.total) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
