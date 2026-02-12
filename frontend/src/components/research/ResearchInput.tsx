import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { researchApi } from "../../api/research";

export function ResearchInput() {
  const { project, isResearching, researchQuery, setResearching } = useProjectStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!project || !query.trim() || loading) return;
    setLoading(true);
    setResearching(true, query.trim());
    try {
      await researchApi.start(project.id, query.trim());
    } catch (e) {
      console.error("Research failed:", e);
      setResearching(false);
    } finally {
      setLoading(false);
    }
  };

  if (isResearching) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-indigo-300">Researching</p>
              <p className="text-sm text-white truncate">{researchQuery}</p>
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full bg-indigo-950 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What do you want to research?"
        rows={3}
        className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#3a3a4e] rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!query.trim() || loading}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
      >
        {loading ? "Starting..." : "Research"}
      </button>
    </div>
  );
}
