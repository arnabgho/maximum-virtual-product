import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClarifyingQuestion } from "../../types";

interface Props {
  topic: string;
  questions: ClarifyingQuestion[];
  loading: boolean;
  onSubmit: (answers: Record<string, string>) => void;
  onBack: () => void;
}

export function ClarifyingQuestions({ topic, questions, loading, onSubmit, onBack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showOther, setShowOther] = useState<Record<string, boolean>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

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
      // Submit
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
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {currentStep === 0 ? "Back to topic" : "Previous question"}
      </button>

      {/* Topic reminder */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-indigo-400 font-medium">Researching</span>
        <span className="text-sm text-zinc-300 truncate">{topic}</span>
      </div>

      {/* Progress dots + question count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? "bg-indigo-500"
                  : i === currentStep
                    ? "bg-indigo-500 ring-2 ring-indigo-500/30"
                    : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-zinc-500">
          Question {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Question content with animation */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="space-y-3"
        >
          {/* Question text */}
          <p className="text-base font-medium text-white">{question.question}</p>

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
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 text-left ${
                    selected
                      ? "bg-indigo-600/10 border-indigo-500/50"
                      : "bg-[#1e1e2e] border-[#3a3a4e] hover:border-zinc-500 hover:bg-[#252538]"
                  }`}
                >
                  {/* Radio indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {selected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2.5 5L4.5 7L7.5 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      selected ? "text-indigo-200" : "text-zinc-300"
                    }`}
                  >
                    {opt}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* "Or type your own" link */}
          {!showOther[question.question] && !isOther ? (
            <button
              onClick={() => {
                setShowOther((prev) => ({ ...prev, [question.question]: true }));
                selectOption("__other__");
              }}
              className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors pt-1"
            >
              Or type your own...
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
                className="w-full px-4 py-3 bg-[#0f0f1a] border border-[#3a3a4e] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
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
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1.5"
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
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        whileTap={hasAnswer && !loading ? { scale: 0.98 } : {}}
      >
        {loading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
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
            Starting Research...
          </>
        ) : isLastStep ? (
          <>
            Start Research
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        ) : (
          <>
            Next
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </motion.button>
    </div>
  );
}
