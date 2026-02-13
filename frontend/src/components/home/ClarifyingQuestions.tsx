import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClarifyingQuestion } from "../../types";

interface Props {
  topic: string;
  questions: ClarifyingQuestion[];
  loading: boolean;
  onSubmit: (answers: Record<string, string>) => void;
  onBack: () => void;
  submitLabel?: string;
  badgeLabel?: string;
}

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function ClarifyingQuestions({ topic, questions, loading, onSubmit, onBack, submitLabel = "Deploy Research", badgeLabel = "Scanning" }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showOther, setShowOther] = useState<Record<string, boolean>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);

  const question = questions[currentStep];
  const totalSteps = questions.length;

  const currentAnswer = question ? answers[question.question] : undefined;
  const isOther = currentAnswer === "__other__";
  const hasAnswer = question && currentAnswer
    ? isOther
      ? (otherText[question.question] || "").trim().length > 0
      : true
    : false;
  const isLastStep = currentStep === totalSteps - 1;

  const selectOption = useCallback(
    (value: string) => {
      if (!question) return;
      setAnswers((prev) => ({ ...prev, [question.question]: value }));
      if (value !== "__other__") {
        setShowOther((prev) => ({ ...prev, [question.question]: false }));
        setOtherText((prev) => {
          const next = { ...prev };
          delete next[question.question];
          return next;
        });
      }
    },
    [question]
  );

  const goNext = useCallback(() => {
    if (isLastStep) {
      const resolved: Record<string, string> = {};
      for (const q of questions) {
        const raw = answers[q.question];
        if (raw === "__other__") {
          resolved[q.question] = otherText[q.question] || "";
        } else if (raw) {
          resolved[q.question] = raw;
        }
      }
      onSubmit(resolved);
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, currentStep, questions, answers, otherText, onSubmit]);

  const goPrev = useCallback(() => {
    if (currentStep === 0) {
      onBack();
    } else {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep, onBack]);

  if (!question) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={goPrev}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono-hud text-xs uppercase tracking-wider"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {currentStep === 0 ? "Back" : "Previous"}
      </button>

      {/* Topic badge */}
      <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
        <span>{badgeLabel}</span>
        <span className="text-[var(--text-primary)] truncate max-w-[200px] normal-case tracking-normal">{topic}</span>
      </div>

      {/* Progress dots with connecting lines */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {questions.map((_, i) => (
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
              {i < questions.length - 1 && (
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
          {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* Question content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, y: direction * 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: direction * -12, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease }}
          className="space-y-3"
        >
          <p className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{question.question}</p>

          {/* Option cards */}
          <div className="space-y-2">
            {question.options.map((opt, i) => {
              const selected = answers[question.question] === opt;
              return (
                <motion.button
                  key={opt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => selectOption(opt)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 text-left ${
                    selected
                      ? "hud-card"
                      : "hud-card"
                  }`}
                  style={selected ? {
                    borderColor: "rgba(0, 229, 255, 0.3)",
                    background: "rgba(0, 229, 255, 0.05)",
                    boxShadow: "0 0 20px rgba(0, 229, 255, 0.08)",
                  } : {}}
                >
                  {/* Radio indicator */}
                  <div
                    className={`w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      selected
                        ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]"
                        : "border-[var(--border-bright)]"
                    }`}
                    style={selected ? { boxShadow: "0 0 8px rgba(0, 229, 255, 0.4)" } : {}}
                  >
                    {selected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        width="10" height="10" viewBox="0 0 10 10" fill="none"
                      >
                        <path d="M2.5 5L4.5 7L7.5 3" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                  </div>
                  <span className={`text-sm ${selected ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]"}`}>
                    {opt}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Custom input toggle */}
          {!showOther[question.question] && !isOther ? (
            <button
              onClick={() => {
                setShowOther((prev) => ({ ...prev, [question.question]: true }));
                selectOption("__other__");
              }}
              className="font-mono-hud text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors uppercase tracking-wider pt-1"
            >
              Custom_Input...
            </button>
          ) : null}

          {/* Other input */}
          {(showOther[question.question] || isOther) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                value={otherText[question.question] || ""}
                onChange={(e) =>
                  setOtherText((prev) => ({
                    ...prev,
                    [question.question]: e.target.value,
                  }))
                }
                onFocus={() => selectOption("__other__")}
                placeholder="Type your answer..."
                autoFocus
                className="w-full px-4 py-3 hud-input rounded-lg text-sm"
              />
              <button
                onClick={() => {
                  setShowOther((prev) => ({ ...prev, [question.question]: false }));
                  if (isOther) {
                    setAnswers((prev) => {
                      const next = { ...prev };
                      delete next[question.question];
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

      {/* Navigation button */}
      <motion.button
        onClick={goNext}
        disabled={!hasAnswer || loading}
        className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
        whileHover={hasAnswer && !loading ? { scale: 1.01 } : {}}
        whileTap={hasAnswer && !loading ? { scale: 0.98 } : {}}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Deploying...
          </>
        ) : isLastStep ? (
          <>
            {submitLabel}
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          <>
            Next
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </motion.button>
    </div>
  );
}
