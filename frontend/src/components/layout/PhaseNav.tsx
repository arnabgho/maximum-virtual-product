import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { exportApi } from "../../api/export";
import type { Phase } from "../../types";

export function PhaseNav() {
  const { project, setPhase, artifacts, isResearching, planDirections, reset, updateProjectTitle } = useProjectStore();
  const [exporting, setExporting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  if (!project) return null;

  const researchCount = artifacts.filter((a) => a.phase === "research").length;
  const planCount = artifacts.filter((a) => a.phase === "plan").length;

  const planLocked = researchCount === 0;
  const planReady = planDirections.length > 0 && project.phase === "research" && !isResearching;

  const phases: { key: Phase; label: string; count: number; locked: boolean }[] = [
    { key: "research", label: "Research", count: researchCount, locked: false },
    { key: "plan", label: "Plan", count: planCount, locked: planLocked },
  ];

  return (
    <header className="h-11 border-b border-[var(--border-dim)] bg-[var(--bg-surface)] flex items-center px-4 gap-4">
      <button
        onClick={() => reset()}
        className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
        title="Back to projects"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {editingTitle ? (
        <input
          ref={inputRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setEditingTitle(false);
            }
          }}
          onBlur={() => {
            const trimmed = titleDraft.trim();
            if (trimmed && trimmed !== project.title) {
              updateProjectTitle(project.id, trimmed);
            }
            setEditingTitle(false);
          }}
          className="text-sm font-semibold text-[var(--text-primary)] mr-4 max-w-[280px] bg-[var(--bg-elevated)] border border-[var(--accent-cyan)] rounded px-1.5 py-0.5 outline-none"
        />
      ) : (
        <span
          className="text-sm font-semibold text-[var(--text-primary)] mr-4 truncate max-w-[200px] cursor-pointer group/title flex items-center gap-1.5 hover:text-[var(--accent-cyan)] transition-colors"
          onClick={() => {
            setTitleDraft(project.title);
            setEditingTitle(true);
          }}
          title="Click to rename"
        >
          {project.title}
          <svg className="w-3 h-3 opacity-0 group-hover/title:opacity-60 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </span>
      )}
      <nav className="flex gap-1">
        {phases.map((p) => {
          if (p.locked) {
            return (
              <span
                key={p.key}
                className="px-3 py-1.5 rounded text-xs font-mono-hud font-medium text-[var(--text-muted)] cursor-not-allowed flex items-center gap-1.5 uppercase tracking-wider"
                title="Complete research first"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {p.label}
              </span>
            );
          }

          const isActive = project.phase === p.key;
          const isPlanGlow = p.key === "plan" && planReady && !isActive;

          return (
            <button
              key={p.key}
              onClick={() => setPhase(p.key)}
              className={`px-3 py-1.5 rounded text-xs font-mono-hud font-medium transition-all uppercase tracking-wider ${
                isActive
                  ? "bg-[var(--accent-cyan)] text-black"
                  : isPlanGlow
                    ? "text-[var(--accent-green)] badge-green animate-pulse"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              {p.label}
              {p.count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">({p.count})</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="ml-auto">
        <button
          onClick={async () => {
            setExporting(true);
            try {
              const data = await exportApi.getMarkdown(project.id);
              const blob = new Blob([data.markdown], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.title.replace(/\s+/g, "-").toLowerCase()}-plan.md`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error("Export failed:", e);
            } finally {
              setExporting(false);
            }
          }}
          disabled={artifacts.length === 0 || exporting}
          className="px-3 py-1.5 rounded text-xs font-mono-hud font-medium text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 uppercase tracking-wider"
          title="Export plan as markdown"
        >
          {exporting ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          Export
        </button>
      </div>
    </header>
  );
}
