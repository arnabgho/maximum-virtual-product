import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { planApi } from "../../api/plan";

export function PlanInput() {
  const { project, isPlanning, planDescription, setPlanning } = useProjectStore();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!project || !description.trim() || loading) return;
    setLoading(true);
    setPlanning(true, description.trim());
    try {
      await planApi.start(project.id, description.trim());
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
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-300">Generating Blueprint</p>
              <p className="text-sm text-white truncate">{planDescription}</p>
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full bg-emerald-950 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your product or project..."
        rows={3}
        className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#3a3a4e] rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!description.trim() || loading}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
      >
        {loading ? "Starting..." : "Generate Blueprint"}
      </button>
    </div>
  );
}
