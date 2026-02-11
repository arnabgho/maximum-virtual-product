import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { researchApi } from "../../api/research";

export function ResearchInput() {
  const { project, setResearching } = useProjectStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!project || !query.trim() || loading) return;
    setLoading(true);
    setResearching(true);
    try {
      await researchApi.start(project.id, query.trim());
    } catch (e) {
      console.error("Research failed:", e);
      setResearching(false);
    } finally {
      setLoading(false);
    }
  };

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
