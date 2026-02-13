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
      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-xs font-mono-hud text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-hover)] transition-colors"
    >
      {id}
      <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}
