import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "../../stores/projectStore";
import { researchApi } from "../../api/research";
import { ClarifyingQuestions } from "../home/ClarifyingQuestions";
import type { ClarifyingQuestion } from "../../types";

type WizardStep = "topic" | "loading_questions" | "clarifying" | "starting";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function ResearchWizardModal() {
  const {
    project,
    showResearchWizard,
    setShowResearchWizard,
    setResearching,
    setResearchContext,
  } = useProjectStore();

  const [step, setStep] = useState<WizardStep>("topic");
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);

  // Close on Escape
  useEffect(() => {
    if (!showResearchWizard) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowResearchWizard(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showResearchWizard, setShowResearchWizard]);

  // Reset step when modal opens
  useEffect(() => {
    if (showResearchWizard) {
      setStep("topic");
      setQuery("");
      setDescription("");
      setQuestions([]);
    }
  }, [showResearchWizard]);

  const handleSubmitTopic = useCallback(async () => {
    if (!query.trim()) return;
    setStep("loading_questions");
    try {
      const result = await researchApi.clarify(query.trim(), description.trim());
      setQuestions(result.questions || []);
      setStep("clarifying");
    } catch (e) {
      console.error("Clarify failed:", e);
      // Fallback: start research directly
      await startResearch({});
    }
  }, [query, description]);

  const startResearch = useCallback(async (context: Record<string, string>) => {
    if (!project || !query.trim()) return;
    setStep("starting");
    setResearchContext(context);
    setResearching(true, query.trim());
    try {
      await researchApi.start(project.id, query.trim(), context);
      setShowResearchWizard(false);
    } catch (e) {
      console.error("Research failed:", e);
      setResearching(false);
      setStep("clarifying");
    }
  }, [project, query, setResearching, setResearchContext, setShowResearchWizard]);

  const handleClarifySubmit = useCallback(async (answers: Record<string, string>) => {
    await startResearch(answers);
  }, [startResearch]);

  const handleClarifyBack = useCallback(() => {
    setStep("topic");
    setQuestions([]);
  }, []);

  if (!showResearchWizard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowResearchWizard(false)}
      />

      {/* Background effects */}
      <div className="grid-bg pointer-events-none" />
      <div className="ambient-glow pointer-events-none" />

      {/* Modal content */}
      <motion.div
        className="relative max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl bg-[var(--bg-deep)] border border-[var(--border-default)] shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease }}
      >
        {/* Close button */}
        <button
          onClick={() => setShowResearchWizard(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-dim)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
              <span>New Research</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Topic + description */}
            {step === "topic" && (
              <motion.div
                key="topic"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                  What do you want to research?
                </h2>

                <div>
                  <div className="font-mono-hud text-[10px] text-[var(--accent-cyan)] uppercase tracking-wider select-none mb-1">
                    Topic &gt;
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && query.trim() && description.trim() && handleSubmitTopic()}
                    placeholder="Enter your research topic..."
                    className="w-full px-4 py-4 hud-input rounded-lg font-mono-hud text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="font-mono-hud text-[10px] text-[var(--text-muted)] uppercase tracking-wider select-none mb-1">
                    Description &gt;
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you want to build or learn about..."
                    rows={3}
                    className="w-full px-4 py-4 hud-input rounded-lg text-sm resize-y"
                  />
                </div>

                <motion.button
                  onClick={handleSubmitTopic}
                  disabled={!query.trim()}
                  className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  whileHover={query.trim() ? { scale: 1.01 } : {}}
                  whileTap={query.trim() ? { scale: 0.98 } : {}}
                >
                  Continue
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </motion.div>
            )}

            {/* Loading questions */}
            {step === "loading_questions" && (
              <motion.div
                key="loading_questions"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <svg className="w-8 h-8 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="font-mono-hud text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                  Processing...
                </p>
              </motion.div>
            )}

            {/* Step 2: Clarifying questions */}
            {step === "clarifying" && questions.length > 0 && (
              <motion.div
                key="clarifying"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
              >
                <ClarifyingQuestions
                  topic={query}
                  questions={questions}
                  loading={false}
                  onSubmit={handleClarifySubmit}
                  onBack={handleClarifyBack}
                  submitLabel="Deploy Research"
                  badgeLabel="Scanning"
                />
              </motion.div>
            )}

            {/* Starting */}
            {step === "starting" && (
              <motion.div
                key="starting"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <svg className="w-8 h-8 text-[var(--accent-cyan)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="font-mono-hud text-sm text-[var(--accent-cyan)] uppercase tracking-wider">
                  Deploying research agents...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
