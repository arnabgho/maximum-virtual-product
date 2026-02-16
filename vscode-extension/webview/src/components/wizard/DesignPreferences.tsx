import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DesignDimension } from "../../vscodeApi";

interface Props {
  dimensions: DesignDimension[];
  onSubmit: (prefs: Record<string, string>) => void;
  onBack: () => void;
  onSkip: () => void;
}

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function DesignPreferences({ dimensions, onSubmit, onBack, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [direction, setDirection] = useState(1);

  const dimension = dimensions[currentStep];
  const total = dimensions.length;
  const isLastStep = currentStep === total - 1;

  const currentPref = dimension ? preferences[dimension.dimension_id] : undefined;
  const isFeedback = currentPref === "__feedback__";
  const hasSelection = dimension && currentPref
    ? isFeedback
      ? (feedbackText[dimension.dimension_id] || "").trim().length > 0
      : true
    : false;

  const selectOption = useCallback(
    (dimId: string, value: string) => {
      setPreferences((prev) => ({ ...prev, [dimId]: value }));
      if (value !== "__feedback__") {
        setShowFeedback((prev) => ({ ...prev, [dimId]: false }));
      }
    },
    []
  );

  const goNext = useCallback(() => {
    if (isLastStep) {
      const resolved: Record<string, string> = {};
      for (const dim of dimensions) {
        const raw = preferences[dim.dimension_id];
        if (raw === "__feedback__") {
          resolved[`design_${dim.dimension_name}`] = `Custom: ${feedbackText[dim.dimension_id] || ""}`;
        } else if (raw) {
          const opt = raw === dim.option_a.label ? dim.option_a : dim.option_b;
          resolved[`design_${dim.dimension_name}`] = `${opt.label}: ${opt.description}`;
        }
      }
      onSubmit(resolved);
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, dimensions, preferences, feedbackText, onSubmit]);

  const goPrev = useCallback(() => {
    if (currentStep === 0) {
      onBack();
    } else {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep, onBack]);

  if (!dimension) return null;

  const imagesLoaded = dimensions.reduce((count, dim) => {
    return count + (dim.option_a.image_url ? 1 : 0) + (dim.option_b.image_url ? 1 : 0);
  }, 0);
  const imagesTotal = dimensions.length * 2;

  return (
    <div className="space-y-6">
      {/* Image progress indicator */}
      {imagesLoaded < imagesTotal && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-dim)]">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
          <span className="font-mono-hud text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            Images: {imagesLoaded}/{imagesTotal} generated
          </span>
          <div className="flex-1 h-1 rounded-full bg-[var(--bg-deep)] overflow-hidden ml-2">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(imagesLoaded / imagesTotal) * 100}%`,
                background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-green))",
              }}
            />
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono-hud text-xs uppercase tracking-wider"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {currentStep === 0 ? "Back" : "Previous"}
        </button>
        <button
          onClick={onSkip}
          className="font-mono-hud text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider"
        >
          Skip all →
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {dimensions.map((_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < currentStep
                    ? "bg-[var(--accent-cyan)]"
                    : i === currentStep
                      ? "bg-[var(--accent-cyan)] shadow-[0_0_8px_var(--accent-cyan)]"
                      : "bg-[var(--border-default)]"
                }`}
              />
              {i < dimensions.length - 1 && (
                <div
                  className={`w-4 h-[1px] transition-all duration-300 ${
                    i < currentStep ? "bg-[var(--accent-cyan)]/50" : "bg-[var(--border-dim)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <span className="font-mono-hud text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          {currentStep + 1}/{total}
        </span>
      </div>

      {/* Dimension content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: direction * -30, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease }}
          className="space-y-4"
        >
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{dimension.dimension_name}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{dimension.description}</p>
          </div>

          {/* Image pair — side by side */}
          <div className="grid grid-cols-2 gap-4">
            {[dimension.option_a, dimension.option_b].map((option) => {
              const selected = preferences[dimension.dimension_id] === option.label;
              return (
                <motion.button
                  key={option.option_id}
                  onClick={() => selectOption(dimension.dimension_id, option.label)}
                  className={`text-left rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                    selected
                      ? "border-[var(--accent-cyan)] shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                      : "border-[var(--border-dim)] hover:border-[var(--border-bright)]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Image area */}
                  <div className="aspect-[4/3] bg-[var(--bg-surface)] relative overflow-hidden">
                    {option.image_url ? (
                      <motion.img
                        src={option.image_url}
                        alt={option.label}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="space-y-2 text-center">
                          <div className="w-8 h-8 mx-auto rounded-lg bg-[var(--bg-elevated)] animate-pulse" />
                          <span className="font-mono-hud text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                            Generating...
                          </span>
                        </div>
                      </div>
                    )}
                    {selected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7L6 10L11 4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Label area */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          selected
                            ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]"
                            : "border-[var(--border-bright)]"
                        }`}
                      >
                        {selected && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <path d="M2.5 5L4.5 7L7.5 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${selected ? "text-[var(--accent-cyan)]" : "text-[var(--text-primary)]"}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] pl-5.5">{option.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Neither — custom feedback */}
          {!showFeedback[dimension.dimension_id] && !isFeedback ? (
            <button
              onClick={() => {
                setShowFeedback((prev) => ({ ...prev, [dimension.dimension_id]: true }));
                selectOption(dimension.dimension_id, "__feedback__");
              }}
              className="font-mono-hud text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors uppercase tracking-wider"
            >
              Neither — describe what you want...
            </button>
          ) : null}

          {(showFeedback[dimension.dimension_id] || isFeedback) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                value={feedbackText[dimension.dimension_id] || ""}
                onChange={(e) =>
                  setFeedbackText((prev) => ({
                    ...prev,
                    [dimension.dimension_id]: e.target.value,
                  }))
                }
                onFocus={() => selectOption(dimension.dimension_id, "__feedback__")}
                placeholder="Describe your preferred style..."
                autoFocus
                className="w-full px-4 py-3 hud-input rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  setShowFeedback((prev) => ({ ...prev, [dimension.dimension_id]: false }));
                  if (isFeedback) {
                    setPreferences((prev) => {
                      const next = { ...prev };
                      delete next[dimension.dimension_id];
                      return next;
                    });
                  }
                }}
                className="font-mono-hud text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mt-1.5 uppercase tracking-wider"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next / Finish button */}
      <motion.button
        onClick={goNext}
        disabled={!hasSelection}
        className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
        whileHover={hasSelection ? { scale: 1.01 } : {}}
        whileTap={hasSelection ? { scale: 0.98 } : {}}
      >
        {isLastStep ? "Continue" : "Next"}
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </div>
  );
}
