import { useProjectStore } from "../../stores/projectStore";

export function ArtifactRefLink({ artifactId }: { artifactId: string }) {
  const { setSelectedArtifact, artifacts } = useProjectStore();
  const artifact = artifacts.find((a) => a.id === artifactId);

  return (
    <button
      onClick={() => setSelectedArtifact(artifactId)}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600/20 text-indigo-300 rounded text-xs font-mono hover:bg-indigo-600/30"
      title={artifact?.title || artifactId}
    >
      {artifactId}
      {artifact && <span className="text-indigo-400/60">({artifact.title})</span>}
    </button>
  );
}
