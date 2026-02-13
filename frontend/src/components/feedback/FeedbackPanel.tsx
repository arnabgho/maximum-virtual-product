import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { api } from "../../api/client";
import type { Feedback } from "../../types";

export function FeedbackPanel({ artifactId }: { artifactId: string }) {
  const { project, feedback, isRegenerating, addFeedback, setRegenerating } = useProjectStore();
  const [comment, setComment] = useState("");
  const artifactFeedback = feedback.filter((f) => f.artifact_id === artifactId);
  const pendingCount = artifactFeedback.filter((f) => f.status === "pending").length;
  const isThisRegenerating = isRegenerating === artifactId;

  const handleSubmit = async () => {
    if (!project || !comment.trim()) return;
    const fb = await api.post<Feedback>(`/api/projects/${project.id}/feedback`, {
      artifact_id: artifactId,
      comment: comment.trim(),
      source: "human",
    });
    addFeedback(fb);
    setComment("");
  };

  const handleRegenerate = async () => {
    if (!project || pendingCount === 0 || isRegenerating) return;
    setRegenerating(artifactId);
    try {
      await api.post(`/api/projects/${project.id}/artifacts/${artifactId}/regenerate`, {});
    } catch (e) {
      console.error("Regeneration failed:", e);
      setRegenerating(null);
    }
  };

  return (
    <div className="border-t border-[var(--border-dim)] p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] font-mono-hud uppercase tracking-wider">Feedback</h4>
        {pendingCount > 0 && (
          <span className="badge-amber px-1.5 py-0.5 text-[10px] font-medium rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>
      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
        {artifactFeedback.map((f) => (
          <div
            key={f.id}
            className={`text-xs p-2 rounded border-l-2 ${
              f.status === "addressed"
                ? "bg-[var(--bg-deep)] border-[var(--accent-green)]"
                : "bg-[var(--bg-deep)] border-[var(--accent-amber)]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={f.source === "ai" ? "text-[var(--accent-cyan)] font-medium" : "text-[var(--text-primary)] font-medium"}>
                {f.source === "ai" ? "AI" : f.author || "You"}
              </span>
              <span className={`text-[10px] px-1 rounded ${
                f.status === "addressed"
                  ? "badge-green"
                  : "badge-amber"
              }`}>
                {f.status}
              </span>
            </div>
            <span className="text-[var(--text-secondary)]">{f.comment}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Add feedback..."
          className="hud-input flex-1 rounded text-xs"
        />
        <button
          onClick={handleSubmit}
          disabled={!comment.trim()}
          className="hud-btn-primary px-3 py-1.5 text-xs rounded"
        >
          Send
        </button>
      </div>

      {/* Regenerate button */}
      <button
        onClick={handleRegenerate}
        disabled={pendingCount === 0 || !!isRegenerating}
        className="hud-btn-primary w-full py-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs rounded font-mono-hud uppercase tracking-wider flex items-center justify-center gap-2"
      >
        {isThisRegenerating ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Regenerating...
          </>
        ) : (
          <>
            Regenerate with Feedback
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/30 rounded-full">{pendingCount}</span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
