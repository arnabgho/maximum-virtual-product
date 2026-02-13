import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { planApi } from "../../api/plan";
import type { PlanDirection } from "../../types";

export function PlanDirections() {
  const { project, isPlanning, planDescription, planDirections, artifacts, setPlanning } =
    useProjectStore();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const researchArtifactIds = artifacts
    .filter((a) => a.phase === "research")
    .map((a) => a.id);

  const handleBuild = async (direction: PlanDirection) => {
    if (!project || loading) return;
    const description = `${direction.title}: ${direction.description}\n\nKey focus: ${direction.key_focus}`;
    setLoading(true);
    setPlanning(true, direction.title);
    try {
      await planApi.start(project.id, description, researchArtifactIds);
    } catch (e) {
      console.error("Plan failed:", e);
      setPlanning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomBuild = async () => {
    if (!project || !customDescription.trim() || loading) return;
    setLoading(true);
    setPlanning(true, customDescription.trim());
    try {
      await planApi.start(project.id, customDescription.trim(), researchArtifactIds);
    } catch (e) {
      console.error("Plan failed:", e);
      setPlanning(false);
    } finally {
      setLoading(false);
    }
  };

  if (isPlanning) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-green)]/10 border border-[var(--accent-cyan)]/20 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)]/5 to-[var(--accent-green)]/5 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--accent-cyan)] font-mono-hud uppercase tracking-wider">Generating Blueprint</p>
              <p className="text-sm text-white truncate">{planDescription}</p>
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full bg-[var(--bg-deep)] overflow-hidden">
            <div className="h-full rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%", background: "linear-gradient(90deg, #00e5ff, #7c3aed)" }} />
          </div>
        </div>
      </div>
    );
  }

  // No directions yet — show loading or fallback
  if (planDirections.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating plan directions...
        </div>
        {/* Fallback: allow custom description */}
        <div className="mt-4 pt-4 border-t border-[var(--border-dim)]">
          <textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Or write your own plan description..."
            rows={3}
            className="hud-input rounded-lg text-sm resize-none"
          />
          <button
            onClick={handleCustomBuild}
            disabled={!customDescription.trim() || loading}
            className="hud-btn-primary rounded-lg font-mono-hud text-xs uppercase tracking-wider w-full mt-2 py-2"
          >
            Generate Blueprint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--text-muted)] font-mono-hud uppercase tracking-wider">
        Suggested Directions
      </p>

      {planDirections.map((dir, i) => {
        const selected = selectedIdx === i && !useCustom;
        return (
          <button
            key={i}
            onClick={() => { setSelectedIdx(i); setUseCustom(false); }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selected
                ? "bg-[var(--accent-cyan)]/5 border-[var(--accent-cyan)]/30"
                : "bg-[var(--bg-surface)] border-[var(--border-dim)] hover:border-[var(--accent-cyan)]/30"
            }`}
          >
            <p className={`text-sm font-medium ${selected ? "text-[var(--accent-cyan)]" : "text-white"}`}>
              {dir.title}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{dir.description}</p>
            <p className="text-[10px] text-zinc-500 mt-1 italic">{dir.key_focus}</p>
          </button>
        );
      })}

      {selectedIdx !== null && !useCustom && planDirections[selectedIdx] && (
        <button
          onClick={() => handleBuild(planDirections[selectedIdx]!)}
          disabled={loading}
          className="hud-btn-primary rounded-lg font-mono-hud text-xs uppercase tracking-wider w-full py-2"
        >
          {loading ? "Starting..." : "Build This Plan"}
        </button>
      )}

      {/* Custom option */}
      <div className="pt-3 border-t border-[var(--border-dim)]">
        <button
          onClick={() => { setUseCustom(true); setSelectedIdx(null); }}
          className={`text-xs font-medium font-mono-hud transition-colors ${
            useCustom ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Write your own direction
        </button>
        {useCustom && (
          <div className="mt-2 space-y-2">
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your product or project..."
              rows={3}
              className="hud-input rounded-lg text-sm resize-none"
              autoFocus
            />
            <button
              onClick={handleCustomBuild}
              disabled={!customDescription.trim() || loading}
              className="hud-btn-primary rounded-lg font-mono-hud text-xs uppercase tracking-wider w-full py-2"
            >
              {loading ? "Starting..." : "Generate Blueprint"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
