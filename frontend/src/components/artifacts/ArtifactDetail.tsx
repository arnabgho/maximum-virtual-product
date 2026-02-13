import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "../../stores/projectStore";
import { ArtifactIdBadge } from "./ArtifactIdBadge";
import { MarkdownContent } from "./MarkdownContent";
import { MermaidContent } from "./MermaidContent";
import { FeedbackPanel } from "../feedback/FeedbackPanel";

export function ArtifactDetail() {
  const { selectedArtifactId, artifacts, setSelectedArtifact, setReviewMode, setReviewArtifactIndex } =
    useProjectStore();
  const [imageExpanded, setImageExpanded] = useState(false);
  const artifact = artifacts.find((a) => a.id === selectedArtifactId);

  const handleClose = useCallback(() => {
    setSelectedArtifact(null);
  }, [setSelectedArtifact]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (selectedArtifactId) {
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
  }, [selectedArtifactId, handleClose]);

  return (
    <AnimatePresence>
      {artifact && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            key="modal"
            className="max-w-4xl w-full max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-dim)] flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {artifact.title}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <ArtifactIdBadge id={artifact.id} />
                  {artifact.phase === "plan" &&
                    (artifact.image_url || artifact.type === "mermaid") && (
                      <button
                        onClick={() => {
                          const planArtifacts = artifacts.filter(
                            (a) => a.phase === "plan"
                          );
                          const idx = planArtifacts.findIndex(
                            (a) => a.id === artifact.id
                          );
                          setSelectedArtifact(null);
                          setReviewArtifactIndex(idx >= 0 ? idx : 0);
                          setReviewMode(true);
                        }}
                        className="text-[10px] text-[var(--accent-cyan)] hover:underline font-mono-hud"
                      >
                        Annotate
                      </button>
                    )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-[var(--text-muted)] hover:text-[var(--accent-cyan)] text-2xl leading-none px-1"
              >
                &times;
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {artifact.source_url && (
                <div className="px-5 py-2 border-b border-[var(--border-dim)]">
                  <a
                    href={artifact.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--accent-cyan)] hover:underline truncate block"
                  >
                    {artifact.source_url}
                  </a>
                </div>
              )}

              {artifact.image_url && (
                <div
                  className="px-5 pt-4 cursor-pointer"
                  onClick={() => setImageExpanded(!imageExpanded)}
                >
                  <img
                    src={artifact.image_url}
                    alt={artifact.title}
                    className={`w-full rounded-lg border border-[var(--border-dim)] ${imageExpanded ? "" : "max-h-80 object-cover"}`}
                  />
                  <p className="text-xs text-zinc-500 mt-1 text-center">
                    {imageExpanded ? "Click to collapse" : "Click to expand"}
                  </p>
                </div>
              )}

              <div className="p-5">
                {artifact.type === "mermaid" ? (
                  <MermaidContent content={artifact.content} />
                ) : (
                  <MarkdownContent content={artifact.content} />
                )}
              </div>

              {artifact.references.length > 0 && (
                <div className="px-5 py-3 border-t border-[var(--border-dim)]">
                  <h4 className="text-xs font-semibold text-zinc-500 mb-1">
                    References
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {artifact.references.map((ref) => (
                      <button
                        key={ref}
                        onClick={() => setSelectedArtifact(ref)}
                        className="badge-cyan font-mono-hud text-xs px-2 py-0.5 rounded hover:opacity-80"
                      >
                        {ref}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-[var(--border-dim)]">
                <FeedbackPanel artifactId={artifact.id} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
