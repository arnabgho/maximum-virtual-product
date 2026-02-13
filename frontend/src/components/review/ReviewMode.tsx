import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import mermaid from "mermaid";
import { useProjectStore } from "../../stores/projectStore";
import { MarkdownContent } from "../artifacts/MarkdownContent";
import { api } from "../../api/client";
import type { Artifact, Feedback, SpatialBounds } from "../../types";

// ---------------------------------------------------------------------------
// ReviewMode — Full-screen spatial annotation review experience
// ---------------------------------------------------------------------------

export function ReviewMode() {
  const {
    project,
    artifacts,
    feedback,
    reviewArtifactIndex,
    batchRegenerateProgress,
    setReviewMode,
    setReviewArtifactIndex,
    addFeedback,
  } = useProjectStore();

  const [hoveredFeedbackId, setHoveredFeedbackId] = useState<string | null>(
    null
  );

  const planArtifacts = useMemo(
    () => artifacts.filter((a) => a.phase === "plan"),
    [artifacts]
  );

  const currentArtifact = planArtifacts[reviewArtifactIndex] ?? null;

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") {
        setReviewMode(false);
      } else if (e.key === "ArrowLeft") {
        setReviewArtifactIndex(reviewArtifactIndex - 1);
      } else if (e.key === "ArrowRight") {
        setReviewArtifactIndex(reviewArtifactIndex + 1);
      } else if (e.key >= "1" && e.key <= "9") {
        const el = document.getElementById(`review-comment-${e.key}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reviewArtifactIndex, setReviewMode, setReviewArtifactIndex]);

  if (!project || planArtifacts.length === 0) return null;

  const artifactFeedback = feedback.filter(
    (f) => f.artifact_id === currentArtifact?.id
  );
  const totalPending = feedback.filter(
    (f) =>
      f.status === "pending" &&
      planArtifacts.some((a) => a.id === f.artifact_id)
  ).length;

  const hasSpatialSupport =
    currentArtifact &&
    (currentArtifact.image_url || currentArtifact.type === "mermaid");

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-deep)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ReviewHeader
        artifact={currentArtifact}
        index={reviewArtifactIndex}
        total={planArtifacts.length}
        totalPending={totalPending}
        planArtifacts={planArtifacts}
        feedback={feedback}
        onPrev={() => setReviewArtifactIndex(reviewArtifactIndex - 1)}
        onNext={() => setReviewArtifactIndex(reviewArtifactIndex + 1)}
        onJump={(i) => setReviewArtifactIndex(i)}
        onClose={() => setReviewMode(false)}
        projectId={project.id}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: image/diagram with annotations */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          {currentArtifact && hasSpatialSupport ? (
            <AnnotatedImage
              artifact={currentArtifact}
              feedback={artifactFeedback}
              hoveredFeedbackId={hoveredFeedbackId}
              onHoverFeedback={setHoveredFeedbackId}
              onAddFeedback={async (comment, bounds) => {
                const fb = await api.post<Feedback>(
                  `/api/projects/${project.id}/feedback`,
                  {
                    artifact_id: currentArtifact.id,
                    comment,
                    source: "human",
                    bounds,
                  }
                );
                addFeedback(fb);
              }}
            />
          ) : currentArtifact ? (
            <div className="max-w-2xl w-full max-h-full overflow-auto bg-[var(--bg-surface)] rounded-xl border border-[var(--border-dim)] p-6">
              <MarkdownContent content={currentArtifact.content} />
            </div>
          ) : null}
        </div>

        {/* Right panel: comments sidebar */}
        {currentArtifact && (
          <CommentSidebar
            artifact={currentArtifact}
            feedback={artifactFeedback}
            projectId={project.id}
            hoveredFeedbackId={hoveredFeedbackId}
            onHoverFeedback={setHoveredFeedbackId}
            hasSpatialSupport={!!hasSpatialSupport}
            onAddFeedback={async (comment) => {
              const fb = await api.post<Feedback>(
                `/api/projects/${project.id}/feedback`,
                {
                  artifact_id: currentArtifact.id,
                  comment,
                  source: "human",
                }
              );
              addFeedback(fb);
            }}
          />
        )}
      </div>

      {/* Hint bar */}
      <div className="h-8 border-t border-[var(--border-dim)] bg-[var(--bg-surface)] flex items-center px-4 text-[11px] text-[var(--text-muted)] font-mono-hud gap-4">
        {hasSpatialSupport ? (
          <span>Click and drag on the image to annotate</span>
        ) : (
          <span>Text-only feedback — use the sidebar</span>
        )}
        <span className="ml-auto opacity-60">
          ESC close &middot; &larr;&rarr; navigate &middot; 1-9 jump to comment
        </span>
      </div>

      {/* Batch progress overlay */}
      {batchRegenerateProgress && (
        <BatchProgressBar progress={batchRegenerateProgress} />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ReviewHeader
// ---------------------------------------------------------------------------

function ReviewHeader({
  artifact,
  index,
  total,
  totalPending,
  planArtifacts,
  feedback,
  onPrev,
  onNext,
  onJump,
  onClose,
  projectId,
}: {
  artifact: Artifact | null;
  index: number;
  total: number;
  totalPending: number;
  planArtifacts: Artifact[];
  feedback: Feedback[];
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  onClose: () => void;
  projectId: string;
}) {
  const [applying, setApplying] = useState(false);

  const handleApplyAll = async () => {
    if (totalPending === 0 || applying) return;
    setApplying(true);
    try {
      await api.post(`/api/projects/${projectId}/batch-regenerate`, {});
    } catch (e) {
      console.error("Batch regenerate failed:", e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border-b border-[var(--border-dim)] bg-[var(--bg-surface)]">
      {/* Main header row */}
      <div className="h-12 flex items-center px-4 gap-3">
        <button
          onClick={onPrev}
          disabled={index <= 0}
          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {artifact?.title ?? "No artifact"}
          </span>
          {artifact && (
            <span className="badge-cyan font-mono-hud text-[10px] px-1.5 py-0.5 rounded shrink-0">
              {artifact.id}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] font-mono-hud shrink-0">
            ({index + 1}/{total})
          </span>
        </div>

        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleApplyAll}
            disabled={totalPending === 0 || applying}
            className="hud-btn-primary px-3 py-1.5 text-xs rounded font-mono-hud uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? (
              <>
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Applying...
              </>
            ) : (
              <>
                Apply All Feedback
                {totalPending > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/30 rounded-full">
                    {totalPending}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="h-14 flex items-center px-4 gap-1.5 overflow-x-auto border-t border-[var(--border-dim)]/50">
        {planArtifacts.map((a, i) => {
          const isActive = i === index;
          const hasPending = feedback.some(
            (f) => f.artifact_id === a.id && f.status === "pending"
          );
          return (
            <button
              key={a.id}
              onClick={() => onJump(i)}
              className={`relative shrink-0 w-16 h-10 rounded border overflow-hidden transition-all ${
                isActive
                  ? "border-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/50"
                  : "border-[var(--border-dim)] hover:border-[var(--text-muted)]"
              }`}
              title={a.title}
            >
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--bg-elevated)] flex items-center justify-center">
                  <span className="text-[8px] text-[var(--text-muted)] font-mono-hud truncate px-0.5">
                    {a.type === "mermaid" ? "DIA" : "MD"}
                  </span>
                </div>
              )}
              {hasPending && (
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnnotatedImage — core Figma-like drawing interaction
// ---------------------------------------------------------------------------

function AnnotatedImage({
  artifact,
  feedback,
  hoveredFeedbackId,
  onHoverFeedback,
  onAddFeedback,
}: {
  artifact: Artifact;
  feedback: Feedback[];
  hoveredFeedbackId: string | null;
  onHoverFeedback: (id: string | null) => void;
  onAddFeedback: (comment: string, bounds: SpatialBounds) => Promise<void>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingBounds, setPendingBounds] = useState<SpatialBounds | null>(
    null
  );

  const toPercent = useCallback(
    (clientX: number, clientY: number) => {
      if (!wrapperRef.current) return { x: 0, y: 0 };
      const rect = wrapperRef.current.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const pt = toPercent(e.clientX, e.clientY);
      setIsDrawing(true);
      setDrawStart(pt);
      setDrawCurrent(pt);
    },
    [toPercent]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      setDrawCurrent(toPercent(e.clientX, e.clientY));
    },
    [isDrawing, toPercent]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);

    // Minimum size threshold: 2%
    if (w < 0.02 || h < 0.02) return;

    setPendingBounds({ x, y, w, h });
  }, [isDrawing, drawStart, drawCurrent]);

  // Number the annotations per-artifact
  const numberedFeedback = feedback.filter((f) => f.bounds);

  return (
    <div className="relative max-w-full max-h-full">
      <div
        ref={wrapperRef}
        className="relative select-none"
        style={{ cursor: isDrawing ? "crosshair" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing) handleMouseUp();
        }}
      >
        {/* Content: image or mermaid */}
        {artifact.image_url ? (
          <img
            src={artifact.image_url}
            alt={artifact.title}
            className="max-w-full max-h-[calc(100vh-14rem)] rounded-lg border border-[var(--border-dim)] pointer-events-none"
            draggable={false}
          />
        ) : artifact.type === "mermaid" ? (
          <MermaidStatic content={artifact.content} />
        ) : null}

        {/* Existing annotations */}
        {numberedFeedback.map((f, idx) => {
          const b = f.bounds!;
          const isHovered = hoveredFeedbackId === f.id;
          const isAddressed = f.status === "addressed";
          const color = isAddressed
            ? "var(--accent-green)"
            : "var(--accent-amber)";
          return (
            <div
              key={f.id}
              className="absolute pointer-events-auto transition-all"
              style={{
                left: `${b.x * 100}%`,
                top: `${b.y * 100}%`,
                width: `${b.w * 100}%`,
                height: `${b.h * 100}%`,
                border: `2px dashed ${color}`,
                backgroundColor: isHovered
                  ? `color-mix(in srgb, ${color} 20%, transparent)`
                  : `color-mix(in srgb, ${color} 8%, transparent)`,
                zIndex: isHovered ? 20 : 10,
              }}
              onMouseEnter={() => onHoverFeedback(f.id)}
              onMouseLeave={() => onHoverFeedback(null)}
            >
              {/* Numbered marker */}
              <div
                className="absolute -top-3 -left-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: color,
                  color: "black",
                }}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}

        {/* Drawing indicator */}
        {isDrawing && drawStart && drawCurrent && (
          <DrawingIndicator start={drawStart} current={drawCurrent} />
        )}
      </div>

      {/* Comment modal after drawing */}
      <AnimatePresence>
        {pendingBounds && (
          <CommentModal
            onSubmit={async (comment) => {
              await onAddFeedback(comment, pendingBounds);
              setPendingBounds(null);
            }}
            onCancel={() => setPendingBounds(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MermaidStatic — fixed zoom=1 mermaid renderer for annotation overlay
// ---------------------------------------------------------------------------

function MermaidStatic({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-review-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, content).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [content]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-dim)] max-h-[calc(100vh-14rem)] overflow-auto pointer-events-none"
    />
  );
}

// ---------------------------------------------------------------------------
// DrawingIndicator — pulsing dashed rectangle during drag
// ---------------------------------------------------------------------------

function DrawingIndicator({
  start,
  current,
}: {
  start: { x: number; y: number };
  current: { x: number; y: number };
}) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const w = Math.abs(current.x - start.x);
  const h = Math.abs(current.y - start.y);

  return (
    <div
      className="absolute border-2 border-dashed border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 animate-pulse pointer-events-none"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        zIndex: 30,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// CommentModal — appears after drawing a rectangle
// ---------------------------------------------------------------------------

function CommentModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (comment: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(comment.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl shadow-2xl p-4 w-80"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-xs font-mono-hud text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Add Comment
        </h4>
        <textarea
          ref={inputRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Describe what should change..."
          className="hud-input w-full h-20 rounded text-xs resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-xs rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors font-mono-hud"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || submitting}
            className="flex-1 hud-btn-primary px-3 py-1.5 text-xs rounded font-mono-hud disabled:opacity-40"
          >
            {submitting ? "Adding..." : "Add Comment"}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
          Cmd+Enter to submit
        </p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CommentSidebar — right panel with numbered feedback list
// ---------------------------------------------------------------------------

function CommentSidebar({
  artifact,
  feedback,
  projectId,
  hoveredFeedbackId,
  onHoverFeedback,
  hasSpatialSupport,
  onAddFeedback,
}: {
  artifact: Artifact;
  feedback: Feedback[];
  projectId: string;
  hoveredFeedbackId: string | null;
  onHoverFeedback: (id: string | null) => void;
  hasSpatialSupport: boolean;
  onAddFeedback: (comment: string) => Promise<void>;
}) {
  const [textComment, setTextComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = feedback.filter((f) => f.status === "pending").length;
  const spatialFeedback = feedback.filter((f) => f.bounds);
  const textOnlyFeedback = feedback.filter((f) => !f.bounds);

  const handleSubmitText = async () => {
    if (!textComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddFeedback(textComment.trim());
      setTextComment("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-72 border-l border-[var(--border-dim)] bg-[var(--bg-surface)] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-dim)] flex items-center justify-between">
        <h3 className="text-xs font-mono-hud text-[var(--text-muted)] uppercase tracking-wider">
          Comments
        </h3>
        {pendingCount > 0 && (
          <span className="badge-amber px-1.5 py-0.5 text-[10px] font-medium rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {feedback.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">
            {hasSpatialSupport
              ? "Draw on the image to annotate, or type below"
              : "Add text feedback below"}
          </p>
        )}

        {/* Spatial annotations with numbers */}
        {spatialFeedback.map((f, idx) => {
          const isHovered = hoveredFeedbackId === f.id;
          const isAddressed = f.status === "addressed";
          return (
            <div
              key={f.id}
              id={`review-comment-${idx + 1}`}
              className={`text-xs p-2 rounded border-l-2 cursor-pointer transition-all ${
                isAddressed
                  ? "bg-[var(--bg-deep)] border-[var(--accent-green)]"
                  : "bg-[var(--bg-deep)] border-[var(--accent-amber)]"
              } ${isHovered ? "ring-1 ring-[var(--accent-cyan)]/50" : ""}`}
              onMouseEnter={() => onHoverFeedback(f.id)}
              onMouseLeave={() => onHoverFeedback(null)}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    backgroundColor: isAddressed
                      ? "var(--accent-green)"
                      : "var(--accent-amber)",
                    color: "black",
                  }}
                >
                  {idx + 1}
                </span>
                <span className="text-[var(--text-primary)] font-medium">
                  {f.author || "You"}
                </span>
                <span
                  className={`text-[10px] px-1 rounded ml-auto ${
                    isAddressed ? "badge-green" : "badge-amber"
                  }`}
                >
                  {f.status}
                </span>
              </div>
              <p className="text-[var(--text-secondary)] pl-5.5">
                {f.comment}
              </p>
            </div>
          );
        })}

        {/* Text-only feedback */}
        {textOnlyFeedback.map((f) => {
          const isAddressed = f.status === "addressed";
          return (
            <div
              key={f.id}
              className={`text-xs p-2 rounded border-l-2 ${
                isAddressed
                  ? "bg-[var(--bg-deep)] border-[var(--accent-green)]"
                  : "bg-[var(--bg-deep)] border-[var(--accent-amber)]"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[var(--text-primary)] font-medium">
                  {f.author || "You"}
                </span>
                <span
                  className={`text-[10px] px-1 rounded ml-auto ${
                    isAddressed ? "badge-green" : "badge-amber"
                  }`}
                >
                  {f.status}
                </span>
              </div>
              <p className="text-[var(--text-secondary)]">{f.comment}</p>
            </div>
          );
        })}
      </div>

      {/* Text input */}
      <div className="p-3 border-t border-[var(--border-dim)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={textComment}
            onChange={(e) => setTextComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitText();
            }}
            placeholder="Add text comment..."
            className="hud-input flex-1 rounded text-xs"
          />
          <button
            onClick={handleSubmitText}
            disabled={!textComment.trim() || submitting}
            className="hud-btn-primary px-3 py-1.5 text-xs rounded disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchProgressBar — overlay during batch regeneration
// ---------------------------------------------------------------------------

function BatchProgressBar({
  progress,
}: {
  progress: {
    total: number;
    completed: number;
    currentArtifactId: string | null;
    failed: number;
  };
}) {
  const pct =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isDone = progress.completed >= progress.total;

  return (
    <motion.div
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-xl shadow-2xl p-4 w-80"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center gap-2 mb-2">
        {!isDone && (
          <svg
            className="w-4 h-4 animate-spin text-[var(--accent-cyan)]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span className="text-xs font-mono-hud text-[var(--text-primary)]">
          {isDone
            ? `Done — ${progress.completed - progress.failed} updated${progress.failed > 0 ? `, ${progress.failed} failed` : ""}`
            : `Applying feedback: ${progress.completed}/${progress.total} artifacts...`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-deep)] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDone ? "bg-[var(--accent-green)]" : "bg-[var(--accent-cyan)]"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
