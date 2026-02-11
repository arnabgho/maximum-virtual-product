import { useProjectStore } from "../../stores/projectStore";

export function RefPicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { artifacts } = useProjectStore();
  const researchArtifacts = artifacts.filter((a) => a.phase === "research");

  if (researchArtifacts.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-zinc-500">Reference Research Artifacts</h4>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {researchArtifacts.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-[#2a2a3e] cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(a.id)}
              onChange={() => onToggle(a.id)}
              className="rounded border-zinc-600"
            />
            <span className="font-mono text-zinc-500">{a.id}</span>
            <span className="text-zinc-300 truncate">{a.title}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
