import { useProjectStore } from "../../stores/projectStore";
import { ArtifactIdBadge } from "./ArtifactIdBadge";
import { MarkdownContent } from "./MarkdownContent";
import { FeedbackPanel } from "../feedback/FeedbackPanel";

export function ArtifactDetail() {
  const { selectedArtifactId, artifacts, setSelectedArtifact } = useProjectStore();
  const artifact = artifacts.find((a) => a.id === selectedArtifactId);

  if (!artifact) return null;

  return (
    <aside className="w-96 border-l border-[#3a3a4e] bg-[#1a1a2e] flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-[#3a3a4e] flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{artifact.title}</h2>
          <ArtifactIdBadge id={artifact.id} />
        </div>
        <button
          onClick={() => setSelectedArtifact(null)}
          className="text-zinc-500 hover:text-white text-lg"
        >
          &times;
        </button>
      </div>
      {artifact.source_url && (
        <div className="px-4 py-2 border-b border-[#3a3a4e]">
          <a
            href={artifact.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:underline truncate block"
          >
            {artifact.source_url}
          </a>
        </div>
      )}
      <div className="p-4 flex-1">
        <MarkdownContent content={artifact.content} />
      </div>
      {artifact.references.length > 0 && (
        <div className="px-4 py-2 border-t border-[#3a3a4e]">
          <h4 className="text-xs font-semibold text-zinc-500 mb-1">References</h4>
          <div className="flex flex-wrap gap-1">
            {artifact.references.map((ref) => (
              <button
                key={ref}
                onClick={() => setSelectedArtifact(ref)}
                className="text-xs bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded font-mono hover:bg-indigo-600/30"
              >
                {ref}
              </button>
            ))}
          </div>
        </div>
      )}
      <FeedbackPanel artifactId={artifact.id} />
    </aside>
  );
}
