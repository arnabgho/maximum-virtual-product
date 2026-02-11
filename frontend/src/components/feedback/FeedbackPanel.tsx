import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { api } from "../../api/client";
import type { Feedback } from "../../types";

export function FeedbackPanel({ artifactId }: { artifactId: string }) {
  const { project, feedback, addFeedback } = useProjectStore();
  const [comment, setComment] = useState("");
  const artifactFeedback = feedback.filter((f) => f.artifact_id === artifactId);

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

  return (
    <div className="border-t border-[#3a3a4e] p-4">
      <h4 className="text-xs font-semibold text-zinc-500 mb-2">Feedback</h4>
      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
        {artifactFeedback.map((f) => (
          <div key={f.id} className="text-xs p-2 rounded bg-[#0f0f1a]">
            <span className={f.source === "ai" ? "text-indigo-400" : "text-zinc-300"}>
              {f.source === "ai" ? "AI" : f.author || "You"}:
            </span>
            <span className="text-zinc-400 ml-1">{f.comment}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Add feedback..."
          className="flex-1 px-2 py-1.5 bg-[#0f0f1a] border border-[#3a3a4e] rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!comment.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
