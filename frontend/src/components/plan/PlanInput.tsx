import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { planApi } from "../../api/plan";

export function PlanInput() {
  const { project, setPlanning } = useProjectStore();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!project || !description.trim() || loading) return;
    setLoading(true);
    setPlanning(true);
    try {
      await planApi.start(project.id, description.trim());
    } catch (e) {
      console.error("Plan failed:", e);
      setPlanning(false);
    } finally {
      setLoading(false);
    }
  };

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
