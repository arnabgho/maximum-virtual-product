import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import mermaid from "mermaid";
import { useExtensionStore } from "../../stores/extensionStore";
import { MarkdownContent } from "../artifacts/MarkdownContent";
import type { Artifact, Feedback, SpatialBounds } from "../../vscodeApi";

export function ReviewMode() {
  const {
    project,
    artifacts,
    feedback,
    reviewArtifactIndex,
    reviewPhase,
    batchRegenerateProgress,
    setReviewMode,
    setReviewArtifactIndex,
    giveFeedback,
    requestBatchRegenerate,
  } = useExtensionStore();

  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<string | null>(null);

  const reviewArtifacts = useMemo(
    () => artifacts.filter((a) => a.phase === (reviewPhase ?? "plan")),
    [artifacts, reviewPhase]
  );

  const currentArtifact = reviewArtifacts[reviewArtifactIndex] ?? null;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") setReviewMode(false);
      else if (e.key === "ArrowLeft") setReviewArtifactIndex(reviewArtifactIndex - 1);
      else if (e.key === "ArrowRight") setReviewArtifactIndex(reviewArtifactIndex + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reviewArtifactIndex, setReviewMode, setReviewArtifactIndex]);

  if (!project || reviewArtifacts.length === 0) return null;

  const artifactFeedback = feedback.filter((f) => f.artifact_id === currentArtifact?.id);
  const totalPending = feedback.filter(
    (f) => f.status === "pending" && reviewArtifacts.some((a) => a.id === f.artifact_id)
  ).length;

  const hasSpatialSupport = currentArtifact && (currentArtifact.image_url || currentArtifact.type === "mermaid");

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-deep)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="border-b border-[var(--border-dim)] bg-[var(--bg-surface)]">
        <div className="h-12 flex items-center px-4 gap-3">
          <button onClick={() => setReviewArtifactIndex(reviewArtifactIndex - 1)} disabled={reviewArtifactIndex <= 0} className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] disabled:opacity-30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{currentArtifact?.title ?? "No artifact"}</span>
            {currentArtifact && <span className="badge-cyan font-mono-hud text-[10px] px-1.5 py-0.5 rounded shrink-0">{currentArtifact.id}</span>}
            <span className="text-xs text-[var(--text-muted)] font-mono-hud shrink-0">({reviewArtifactIndex + 1}/{reviewArtifacts.length})</span>
          </div>
          <button onClick={() => setReviewArtifactIndex(reviewArtifactIndex + 1)} disabled={reviewArtifactIndex >= reviewArtifacts.length - 1} className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] disabled:opacity-30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={requestBatchRegenerate} disabled={totalPending === 0} className="hud-btn-primary px-3 py-1.5 text-xs rounded font-mono-hud uppercase tracking-wider disabled:opacity-40">
              Apply All Feedback {totalPending > 0 && <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/30 rounded-full ml-1">{totalPending}</span>}
            </button>
            <button onClick={() => setReviewMode(false)} className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="h-14 flex items-center px-4 gap-1.5 overflow-x-auto border-t border-[var(--border-dim)]/50">
          {reviewArtifacts.map((a, i) => {
            const isActive = i === reviewArtifactIndex;
            const hasPending = feedback.some((f) => f.artifact_id === a.id && f.status === "pending");
            return (
              <button
                key={a.id}
                onClick={() => setReviewArtifactIndex(i)}
                className={`relative shrink-0 w-16 h-10 rounded border overflow-hidden transition-all ${isActive ? "border-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/50" : "border-[var(--border-dim)] hover:border-[var(--text-muted)]"}`}
                title={a.title}
              >
                {a.image_url ? <img src={a.image_url} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full bg-[var(--bg-elevated)] flex items-center justify-center">
                    <span className="text-[8px] text-[var(--text-muted)] font-mono-hud">{a.type === "mermaid" ? "DIA" : "MD"}</span>
                  </div>
                )}
                {hasPending && <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          {currentArtifact && hasSpatialSupport ? (
            <AnnotatedImage
              artifact={currentArtifact}
              feedback={artifactFeedback}
              hoveredFeedbackId={hoveredFeedbackId}
              onHoverFeedback={setHoveredFeedbackId}
              onAddFeedback={async (comment, bounds) => {
                giveFeedback(currentArtifact.id, comment, bounds);
              }}
            />
          ) : currentArtifact ? (
            <div className="max-w-4xl w-full max-h-full overflow-auto bg-[var(--bg-surface)] rounded-xl border border-[var(--border-dim)] p-6">
              <MarkdownContent content={currentArtifact.content} />
            </div>
          ) : null}
        </div>

        {currentArtifact && (
          <CommentSidebar
            artifact={currentArtifact}
            feedback={artifactFeedback}
            hoveredFeedbackId={hoveredFeedbackId}
            onHoverFeedback={setHoveredFeedbackId}
            hasSpatialSupport={!!hasSpatialSupport}
            onAddFeedback={(comment) => giveFeedback(currentArtifact.id, comment)}
          />
        )}
      </div>

      <div className="h-8 border-t border-[var(--border-dim)] bg-[var(--bg-surface)] flex items-center px-4 text-[11px] text-[var(--text-muted)] font-mono-hud gap-4">
        {hasSpatialSupport ? <span>Click and drag on the image to annotate</span> : <span>Text-only feedback — use the sidebar</span>}
        <span className="ml-auto opacity-60">ESC close | arrows navigate</span>
      </div>

      {batchRegenerateProgress && <BatchProgressBar progress={batchRegenerateProgress} />}
    </motion.div>
  );
}

// AnnotatedImage
function AnnotatedImage({
  artifact, feedback, hoveredFeedbackId, onHoverFeedback, onAddFeedback,
}: {
  artifact: Artifact; feedback: Feedback[]; hoveredFeedbackId: string | null;
  onHoverFeedback: (id: string | null) => void;
  onAddFeedback: (comment: string, bounds: SpatialBounds) => Promise<void>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMermaid = !artifact.image_url && artifact.type === "mermaid";
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pendingBounds, setPendingBounds] = useState<SpatialBounds | null>(null);

  useEffect(() => { setZoom(1); }, [artifact.id]);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pt = toPercent(e.clientX, e.clientY);
    setIsDrawing(true); setDrawStart(pt); setDrawCurrent(pt);
  }, [toPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    setDrawCurrent(toPercent(e.clientX, e.clientY));
  }, [isDrawing, toPercent]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) { setIsDrawing(false); return; }
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    setIsDrawing(false); setDrawStart(null); setDrawCurrent(null);
    if (w < 0.02 || h < 0.02) return;
    setPendingBounds({ x, y, w, h });
  }, [isDrawing, drawStart, drawCurrent]);

  const numberedFeedback = feedback.filter((f) => f.bounds);

  return (
    <div className="relative max-w-full max-h-full flex flex-col">
      {isMermaid && (
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono-hud text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-dim)]">-</button>
          <span className="text-[11px] font-mono-hud text-[var(--text-muted)] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono-hud text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-dim)]">+</button>
        </div>
      )}

      <div className="overflow-auto max-h-[calc(100vh-11rem)]">
        <div
          ref={wrapperRef}
          className="relative select-none"
          style={{ cursor: "crosshair", ...(isMermaid ? { transform: `scale(${zoom})`, transformOrigin: "top left" } : {}) }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (isDrawing) handleMouseUp(); }}
        >
          {artifact.image_url ? (
            <img src={artifact.image_url} alt={artifact.title} className="max-w-full max-h-[calc(100vh-14rem)] rounded-lg border border-[var(--border-dim)] pointer-events-none" draggable={false} />
          ) : artifact.type === "mermaid" ? (
            <MermaidStatic content={artifact.content} />
          ) : null}

          {numberedFeedback.map((f, idx) => {
            const b = f.bounds!;
            const isHovered = hoveredFeedbackId === f.id;
            const isAddressed = f.status === "addressed";
            const color = isAddressed ? "var(--accent-green)" : "var(--accent-amber)";
            return (
              <div
                key={f.id}
                className="absolute pointer-events-auto transition-all"
                style={{
                  left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`,
                  border: `2px dashed ${color}`,
                  backgroundColor: isHovered ? `color-mix(in srgb, ${color} 20%, transparent)` : `color-mix(in srgb, ${color} 8%, transparent)`,
                  zIndex: isHovered ? 20 : 10,
                }}
                onMouseEnter={() => onHoverFeedback(f.id)}
                onMouseLeave={() => onHoverFeedback(null)}
              >
                <div className="absolute -top-3 -left-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: color, color: "black" }}>{idx + 1}</div>
              </div>
            );
          })}

          {isDrawing && drawStart && drawCurrent && (
            <div
              className="absolute border-2 border-dashed border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 animate-pulse pointer-events-none"
              style={{
                left: `${Math.min(drawStart.x, drawCurrent.x) * 100}%`,
                top: `${Math.min(drawStart.y, drawCurrent.y) * 100}%`,
                width: `${Math.abs(drawCurrent.x - drawStart.x) * 100}%`,
                height: `${Math.abs(drawCurrent.y - drawStart.y) * 100}%`,
                zIndex: 30,
              }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {pendingBounds && (
          <CommentModal
            onSubmit={async (comment) => { await onAddFeedback(comment, pendingBounds); setPendingBounds(null); }}
            onCancel={() => setPendingBounds(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MermaidStatic({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-review-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, content).then(({ svg }) => { if (ref.current) ref.current.innerHTML = svg; });
  }, [content]);
  return <div ref={ref} className="flex items-center justify-center p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-dim)] pointer-events-none min-w-[600px]" />;
}

function CommentModal({ onSubmit, onCancel }: { onSubmit: (comment: string) => Promise<void>; onCancel: () => void }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit(comment.trim()); } finally { setSubmitting(false); }
  };

  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <motion.div className="bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl shadow-2xl p-4 w-80" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
        <h4 className="text-xs font-mono-hud text-[var(--text-muted)] uppercase tracking-wider mb-2">Add Comment</h4>
        <textarea ref={inputRef} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); if (e.key === "Escape") onCancel(); }} placeholder="Describe what should change..." className="hud-input w-full h-20 rounded text-xs resize-none p-2" />
        <div className="flex gap-2 mt-2">
          <button onClick={onCancel} className="flex-1 px-3 py-1.5 text-xs rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono-hud">Cancel</button>
          <button onClick={handleSubmit} disabled={!comment.trim() || submitting} className="flex-1 hud-btn-primary px-3 py-1.5 text-xs rounded font-mono-hud disabled:opacity-40">{submitting ? "Adding..." : "Add Comment"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// CommentSidebar
function CommentSidebar({
  artifact, feedback, hoveredFeedbackId, onHoverFeedback, hasSpatialSupport, onAddFeedback,
}: {
  artifact: Artifact; feedback: Feedback[]; hoveredFeedbackId: string | null;
  onHoverFeedback: (id: string | null) => void; hasSpatialSupport: boolean;
  onAddFeedback: (comment: string) => void;
}) {
  const [textComment, setTextComment] = useState("");
  const pendingCount = feedback.filter((f) => f.status === "pending").length;
  const spatialFeedback = feedback.filter((f) => f.bounds);
  const textOnlyFeedback = feedback.filter((f) => !f.bounds);

  const handleSubmitText = () => {
    if (!textComment.trim()) return;
    onAddFeedback(textComment.trim());
    setTextComment("");
  };

  return (
    <div className="w-80 border-l border-[var(--border-dim)] bg-[var(--bg-surface)] flex flex-col">
      <div className="p-3 border-b border-[var(--border-dim)] flex items-center justify-between">
        <h3 className="text-xs font-mono-hud text-[var(--text-muted)] uppercase tracking-wider">Comments</h3>
        {pendingCount > 0 && <span className="badge-amber px-1.5 py-0.5 text-[10px] font-medium rounded-full">{pendingCount} pending</span>}
      </div>

      {/* Content section for non-mermaid artifacts */}
      {artifact.type !== "mermaid" && artifact.content && (
        <div className="border-b border-[var(--border-dim)] px-3 py-3 max-h-[40vh] overflow-y-auto text-xs">
          <MarkdownContent content={artifact.content} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {feedback.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">
            {hasSpatialSupport ? "Draw on the image to annotate, or type below" : "Add text feedback below"}
          </p>
        )}

        {spatialFeedback.map((f, idx) => {
          const isHovered = hoveredFeedbackId === f.id;
          const isAddressed = f.status === "addressed";
          return (
            <div
              key={f.id}
              className={`text-xs p-2 rounded border-l-2 cursor-pointer transition-all ${isAddressed ? "bg-[var(--bg-deep)] border-[var(--accent-green)]" : "bg-[var(--bg-deep)] border-[var(--accent-amber)]"} ${isHovered ? "ring-1 ring-[var(--accent-cyan)]/50" : ""}`}
              onMouseEnter={() => onHoverFeedback(f.id)}
              onMouseLeave={() => onHoverFeedback(null)}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: isAddressed ? "var(--accent-green)" : "var(--accent-amber)", color: "black" }}>{idx + 1}</span>
                <span className="text-[var(--text-primary)] font-medium">{f.author || "You"}</span>
                <span className={`text-[10px] px-1 rounded ml-auto ${isAddressed ? "badge-green" : "badge-amber"}`}>{f.status}</span>
              </div>
              <p className="text-[var(--text-secondary)] pl-5.5">{f.comment}</p>
            </div>
          );
        })}

        {textOnlyFeedback.map((f) => (
          <div key={f.id} className={`text-xs p-2 rounded border-l-2 ${f.status === "addressed" ? "bg-[var(--bg-deep)] border-[var(--accent-green)]" : "bg-[var(--bg-deep)] border-[var(--accent-amber)]"}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[var(--text-primary)] font-medium">{f.author || "You"}</span>
              <span className={`text-[10px] px-1 rounded ml-auto ${f.status === "addressed" ? "badge-green" : "badge-amber"}`}>{f.status}</span>
            </div>
            <p className="text-[var(--text-secondary)]">{f.comment}</p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-[var(--border-dim)]">
        <div className="flex gap-2">
          <input type="text" value={textComment} onChange={(e) => setTextComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmitText(); }} placeholder="Add text comment..." className="hud-input flex-1 rounded text-xs px-2 py-1.5" />
          <button onClick={handleSubmitText} disabled={!textComment.trim()} className="hud-btn-primary px-3 py-1.5 text-xs rounded disabled:opacity-40">Send</button>
        </div>
      </div>
    </div>
  );
}

function BatchProgressBar({ progress }: { progress: { total: number; completed: number; currentArtifactId: string | null; failed: number } }) {
  const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isDone = progress.completed >= progress.total;

  return (
    <motion.div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl shadow-2xl p-4 w-80" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-2">
        {!isDone && (
          <svg className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <span className="text-xs font-mono-hud text-[var(--text-primary)]">
          {isDone ? `Done — ${progress.completed - progress.failed} updated${progress.failed > 0 ? `, ${progress.failed} failed` : ""}` : `Applying feedback: ${progress.completed}/${progress.total}...`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-deep)] overflow-hidden">
        <motion.div className={`h-full rounded-full ${isDone ? "bg-[var(--accent-green)]" : "bg-[var(--accent-cyan)]"}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>
    </motion.div>
  );
}
