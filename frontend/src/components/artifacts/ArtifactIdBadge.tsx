import { useState } from "react";

export function ArtifactIdBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
    >
      {id}
      <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}
