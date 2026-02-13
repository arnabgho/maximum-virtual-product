import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useProjectStore } from "../../stores/projectStore";
import type { AgentStatus, PlanStage } from "../../types";

/* ─── Merge directions + agents into unified streams ─── */

interface ResearchStream {
  id: string;
  angle: string;
  sub_query: string;
  status: "planned" | "running" | "complete" | "error";
  thinking?: string;
  artifact_count?: number;
}

function buildStreams(
  directions: { angle: string; sub_query: string }[],
  agents: AgentStatus[],
): ResearchStream[] {
  if (directions.length > 0) {
    const usedAgents = new Set<string>();
    const streams: ResearchStream[] = directions.map((dir, i) => {
      const agent = agents.find(
        (a) => a.focus_area === dir.angle && !usedAgents.has(a.agent_id),
      );
      if (agent) usedAgents.add(agent.agent_id);
      return {
        id: agent?.agent_id ?? `dir_${i}`,
        angle: dir.angle,
        sub_query: dir.sub_query,
        status: agent
          ? agent.status === "complete"
            ? "complete"
            : agent.status === "error"
              ? "error"
              : "running"
          : "planned",
        thinking: agent?.thinking,
        artifact_count: agent?.artifact_count,
      };
    });
    for (const agent of agents) {
      if (!usedAgents.has(agent.agent_id)) {
        streams.push({
          id: agent.agent_id,
          angle: agent.focus_area || agent.agent_id,
          sub_query: agent.sub_query || "",
          status: agent.status === "complete" ? "complete" : agent.status === "error" ? "error" : "running",
          thinking: agent.thinking,
          artifact_count: agent.artifact_count,
        });
      }
    }
    return streams;
  }
  return agents.map((a) => ({
    id: a.agent_id,
    angle: a.focus_area || a.agent_id,
    sub_query: a.sub_query || "",
    status: a.status === "complete" ? "complete" : a.status === "error" ? "error" : "running",
    thinking: a.thinking,
    artifact_count: a.artifact_count,
  }));
}

/* ─── Main component ─── */

export function FloatingProgress() {
  const {
    agents,
    isResearching,
    isPlanning,
    researchQuery,
    planDescription,
    imageGenerationProgress,
    researchDirections,
    planStages,
  } = useProjectStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeAgents = agents.filter((a) => a.status === "running");
  const hasImageProgress =
    imageGenerationProgress !== null &&
    imageGenerationProgress.completed < imageGenerationProgress.total;
  const isActive =
    isResearching || isPlanning || activeAgents.length > 0 || hasImageProgress;

  useEffect(() => {
    if (isActive && !isExpanded) setIsExpanded(true);
  }, [isActive]);

  if (!isActive && agents.length === 0) return null;

  const phaseLabel = isResearching ? "Researching" : isPlanning ? "Planning" : "Processing";
  const phaseQuery = isResearching ? researchQuery : isPlanning ? planDescription : "";

  const indicator = (
    <AnimatePresence>
      {(isActive || agents.length > 0) && (
        <motion.div
          className="fixed z-[100]"
          style={{ top: 16, right: 16 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div
            className={`backdrop-blur-xl rounded-2xl border shadow-2xl overflow-hidden ${isExpanded ? "w-80" : "w-20 h-20"}`}
            style={{
              backgroundColor: "rgba(0, 31, 63, 0.95)",
              borderColor: "#00d4ff",
              boxShadow: "0 0 30px rgba(0, 212, 255, 0.3)",
            }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header / Collapsed */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="flex items-center gap-3">
                {/* Spinner */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: "rgba(0, 212, 255, 0.3)" }}
                  />
                  {isActive && (
                    <div
                      className="absolute inset-0 border-2 border-transparent rounded-full animate-spin"
                      style={{
                        borderTopColor: "#00ffff",
                        filter: "drop-shadow(0 0 4px rgba(0, 255, 255, 0.8))",
                      }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00ff88" }} />
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#00ffff" }}>
                        {phaseQuery || phaseLabel}
                      </p>
                      <p className="text-xs" style={{ color: "#40e0d0" }}>
                        {isActive ? `${phaseLabel}...` : "Complete"}
                      </p>
                    </div>
                    <button
                      className="p-1 rounded-lg transition-colors flex-shrink-0 hover:bg-[rgba(0,153,255,0.3)]"
                      style={{ color: "#40e0d0" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="border-t"
                  style={{ borderTopColor: "rgba(0, 153, 255, 0.5)" }}
                >
                  <ExpandedContent
                    agents={agents}
                    researchDirections={researchDirections}
                    isResearching={isResearching}
                    isPlanning={isPlanning}
                    planStages={planStages}
                    isActive={isActive}
                    imageGenerationProgress={imageGenerationProgress}
                    hasImageProgress={hasImageProgress}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(indicator, document.body);
}

/* ─── Expanded content section ─── */

function ExpandedContent({
  agents,
  researchDirections,
  isResearching,
  isPlanning,
  planStages,
  isActive,
  imageGenerationProgress,
  hasImageProgress,
}: {
  agents: AgentStatus[];
  researchDirections: { angle: string; sub_query: string }[];
  isResearching: boolean;
  isPlanning: boolean;
  planStages: PlanStage[];
  isActive: boolean;
  imageGenerationProgress: { total: number; completed: number } | null;
  hasImageProgress: boolean;
}) {
  const streams = useMemo(
    () => buildStreams(researchDirections, agents),
    [researchDirections, agents],
  );
  const completedCount = streams.filter((s) => s.status === "complete").length;
  const totalCount = streams.length;

  const artifactStages = planStages.filter((s) => s.detail !== "connection" && s.id !== "images");
  const connectionStages = planStages.filter((s) => s.detail === "connection");
  const imageStage = planStages.find((s) => s.id === "images");

  return (
    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
      {/* Research: no directions yet */}
      {isResearching && streams.length === 0 && (
        <div className="text-center py-2">
          <p className="text-xs" style={{ color: "#00d4ff" }}>
            Analyzing topic & planning research angles...
          </p>
        </div>
      )}

      {/* Research directions section card */}
      {streams.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "rgba(0, 212, 255, 0.08)",
            borderColor: "rgba(0, 212, 255, 0.25)",
          }}
        >
          {/* Section header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b"
            style={{ borderBottomColor: "rgba(0, 212, 255, 0.2)" }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{
                backgroundColor: isActive ? "#00d4ff" : "#00ff88",
                boxShadow: `0 0 6px ${isActive ? "rgba(0, 212, 255, 0.8)" : "rgba(0, 255, 136, 0.8)"}`,
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#00d4ff" }}>
              Research Directions
            </span>
            <span className="text-xs ml-auto tabular-nums" style={{ color: "rgba(64, 224, 208, 0.7)" }}>
              {completedCount}/{totalCount} complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="px-3 pt-2 pb-1">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(0, 212, 255, 0.15)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#00d4ff" }}
                animate={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Stream rows */}
          <div className="px-3 pb-3 pt-1 space-y-0.5">
            {streams.map((stream, i) => (
              <StreamRow key={stream.id} stream={stream} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Plan generation stages */}
      {isPlanning && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "rgba(124, 58, 237, 0.08)",
            borderColor: "rgba(124, 58, 237, 0.25)",
          }}
        >
          {/* Section header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b"
            style={{ borderBottomColor: "rgba(124, 58, 237, 0.2)" }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{
                backgroundColor: "#a78bfa",
                boxShadow: "0 0 6px rgba(167, 139, 250, 0.8)",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>
              Blueprint Components
            </span>
            <span className="text-xs ml-auto tabular-nums" style={{ color: "rgba(167, 139, 250, 0.7)" }}>
              {artifactStages.length} created
            </span>
          </div>

          <div className="px-3 pb-3 pt-1 space-y-0.5">
            {planStages.length === 0 && (
              <div className="py-2 text-center">
                <p className="text-[11px]" style={{ color: "rgba(167, 139, 250, 0.6)" }}>
                  Analyzing direction & generating components...
                </p>
              </div>
            )}

            {/* Artifact rows */}
            {artifactStages.map((stage, i) => (
              <PlanStageRow key={stage.id} stage={stage} index={i} />
            ))}

            {/* Connections summary */}
            {connectionStages.length > 0 && (
              <motion.div
                className="py-2 flex items-center gap-2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#00ff88", boxShadow: "0 0 6px rgba(0, 255, 136, 0.6)" }}
                />
                <span className="text-xs" style={{ color: "#e0f8ff" }}>
                  Connections
                </span>
                <span className="text-[10px] ml-auto" style={{ color: "rgba(0, 255, 136, 0.8)" }}>
                  {connectionStages.length} linked
                </span>
              </motion.div>
            )}

            {/* Image generation progress */}
            {imageStage && (
              <motion.div
                className="py-2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${imageStage.status === "running" ? "animate-pulse" : ""}`}
                    style={{
                      backgroundColor: imageStage.status === "complete" ? "#00ff88" : "#d946ef",
                      boxShadow: `0 0 6px ${imageStage.status === "complete" ? "rgba(0, 255, 136, 0.6)" : "rgba(217, 70, 239, 0.6)"}`,
                    }}
                  />
                  <span className="text-xs" style={{ color: "#e0f8ff" }}>
                    {imageStage.label}
                  </span>
                  <span className="text-[10px] ml-auto" style={{ color: imageStage.status === "complete" ? "rgba(0, 255, 136, 0.8)" : "rgba(217, 70, 239, 0.8)" }}>
                    {imageStage.status === "complete" ? "Done" : imageStage.detail}
                  </span>
                </div>
                {imageStage.status === "running" && imageGenerationProgress && (
                  <div
                    className="h-1 rounded-full overflow-hidden ml-3.5"
                    style={{ backgroundColor: "rgba(217, 70, 239, 0.15)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }}
                      animate={{
                        width: `${(imageGenerationProgress.completed / imageGenerationProgress.total) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Image generation progress (research phase, standalone) */}
      {!isPlanning && hasImageProgress && imageGenerationProgress && (
        <div
          className="rounded-xl p-3 border"
          style={{
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderColor: "rgba(139, 92, 246, 0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: "#a78bfa",
                boxShadow: "0 0 6px rgba(167, 139, 250, 0.8)",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>
              Generating Images
            </span>
            <span className="text-xs ml-auto tabular-nums" style={{ color: "rgba(167, 139, 250, 0.7)" }}>
              {imageGenerationProgress.completed}/{imageGenerationProgress.total}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(139, 92, 246, 0.2)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #8b5cf6, #d946ef)" }}
              initial={{ width: 0 }}
              animate={{
                width: `${(imageGenerationProgress.completed / imageGenerationProgress.total) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Individual stream row ─── */

const streamStatusStyles = {
  planned: { dot: "#5eead4", dotGlow: "none", label: "Queued", labelColor: "#5eead4" },
  running: { dot: "#facc15", dotGlow: "0 0 6px rgba(250, 204, 21, 0.6)", label: "Searching", labelColor: "#facc15" },
  complete: { dot: "#00ff88", dotGlow: "0 0 6px rgba(0, 255, 136, 0.6)", label: "Done", labelColor: "#00ff88" },
  error: { dot: "#f87171", dotGlow: "0 0 6px rgba(248, 113, 113, 0.6)", label: "Failed", labelColor: "#f87171" },
};

function StreamRow({ stream, index }: { stream: ResearchStream; index: number }) {
  const cfg = streamStatusStyles[stream.status];

  return (
    <motion.div
      className="py-2 border-b last:border-b-0"
      style={{ borderBottomColor: "rgba(0, 153, 255, 0.12)" }}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
    >
      {/* Top line: dot + angle + status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stream.status === "running" ? "animate-pulse" : ""}`}
          style={{ backgroundColor: cfg.dot, boxShadow: cfg.dotGlow }}
        />
        <span className="text-xs font-medium flex-1 truncate" style={{ color: "#e0f8ff" }}>
          {stream.angle}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: cfg.labelColor, opacity: 0.8 }}>
          {stream.status === "complete" && stream.artifact_count != null
            ? `${stream.artifact_count} found`
            : cfg.label}
        </span>
      </div>

      {/* Sub-query */}
      {stream.sub_query && (
        <p className="text-[11px] leading-relaxed mt-1 ml-3.5 line-clamp-2" style={{ color: "rgba(224, 248, 255, 0.5)" }}>
          {stream.sub_query}
        </p>
      )}

      {/* Live thinking */}
      {stream.status === "running" && stream.thinking && (
        <p
          className="text-[11px] mt-1 ml-3.5 truncate italic"
          style={{ color: "rgba(250, 204, 21, 0.5)" }}
        >
          {stream.thinking}
        </p>
      )}
    </motion.div>
  );
}

/* ─── Plan stage row ─── */

function PlanStageRow({ stage, index }: { stage: PlanStage; index: number }) {
  return (
    <motion.div
      className="py-2 border-b last:border-b-0"
      style={{ borderBottomColor: "rgba(124, 58, 237, 0.12)" }}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: "#00ff88",
            boxShadow: "0 0 6px rgba(0, 255, 136, 0.6)",
          }}
        />
        <span className="text-xs font-medium flex-1 truncate" style={{ color: "#e0f8ff" }}>
          {stage.label}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(167, 139, 250, 0.7)" }}>
          {stage.detail}
        </span>
      </div>
    </motion.div>
  );
}
