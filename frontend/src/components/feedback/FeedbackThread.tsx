import type { Feedback } from "../../types";

export function FeedbackThread({ items }: { items: Feedback[] }) {
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div
          key={f.id}
          className={`text-xs p-2 rounded ${
            f.source === "ai" ? "bg-indigo-900/20 border border-indigo-800/30" : "bg-[#0f0f1a]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={f.source === "ai" ? "text-indigo-400" : "text-zinc-400"}>
              {f.source === "ai" ? "AI" : f.author || "You"}
            </span>
            <span className="text-zinc-600">
              {new Date(f.created_at).toLocaleString()}
            </span>
            <span
              className={`px-1 rounded text-[10px] ${
                f.status === "addressed"
                  ? "bg-green-900/30 text-green-400"
                  : "bg-yellow-900/30 text-yellow-400"
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
