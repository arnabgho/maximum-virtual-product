import type { Feedback } from "../../types";

export function FeedbackThread({ items }: { items: Feedback[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div
          key={f.id}
          className={`text-xs p-2 rounded ${
            f.source === "ai" ? "bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/10" : "bg-[var(--bg-deep)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={f.source === "ai" ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]"}>
              {f.source === "ai" ? "AI" : f.author || "You"}
            </span>
            <span className="text-zinc-600">
              {new Date(f.created_at).toLocaleString()}
            </span>
            <span
              className={`px-1 rounded text-[10px] ${
                f.status === "addressed"
                  ? "badge-green"
                  : "badge-amber"
              }`}
            >
              {f.status}
            </span>
          </div>
          <p className="text-zinc-300">{f.comment}</p>
        </div>
      ))}
    </div>
  );
}
