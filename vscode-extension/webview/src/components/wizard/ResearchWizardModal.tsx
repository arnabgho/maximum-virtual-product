import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExtensionStore } from "../../stores/extensionStore";
import { ClarifyingQuestions } from "./ClarifyingQuestions";

type WizardStep =
  | "topic"
  | "describing"
  | "loading_questions"
  | "clarifying"
  | "naming"
  | "starting";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function StepIndicator({ step }: { step: WizardStep }) {
  const stepNum =
    step === "topic" ? 0
    : step === "describing" ? 1
    : step === "loading_questions" || step === "clarifying" ? 2
    : 3;

  const steps = [
    { label: "01", name: "Topic" },
    { label: "02", name: "Details" },
    { label: "03", name: "Deploy" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono-hud text-xs font-bold transition-all duration-300 ${
                i < stepNum
                  ? "bg-[var(--accent-cyan)] text-black"
                  : i === stepNum
                    ? "hud-btn-primary text-[var(--accent-cyan)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-dim)]"
              }`}
            >
              {i < stepNum ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                s.label
              )}
            </div>
            <span className={`font-mono-hud text-[9px] uppercase tracking-wider ${
              i <= stepNum ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"
            }`}>
              {s.name}
            </span>
          </div>
          {i < 2 && (
            <div className="relative w-16 h-[1px] mx-2 mb-5">
              <div className="absolute inset-0 bg-[var(--border-dim)]" />
              <motion.div
                className="absolute inset-y-0 left-0 bg-[var(--accent-cyan)]"
                initial={false}
                animate={{ width: i < stepNum ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ResearchWizardModal() {
  const showResearchWizard = useExtensionStore((s) => s.showResearchWizard);
  const researchClarifyingQuestions = useExtensionStore((s) => s.researchClarifyingQuestions);
  const researchSuggestedName = useExtensionStore((s) => s.researchSuggestedName);
  const researchWizardLoading = useExtensionStore((s) => s.researchWizardLoading);
  const researchTopic = useExtensionStore((s) => s.researchTopic);
  const isResearching = useExtensionStore((s) => s.isResearching);
  const setShowResearchWizard = useExtensionStore((s) => s.setShowResearchWizard);
  const setResearchWizardLoading = useExtensionStore((s) => s.setResearchWizardLoading);
  const setResearchTopic = useExtensionStore((s) => s.setResearchTopic);
  const setResearchDescription = useExtensionStore((s) => s.setResearchDescription);
  const requestResearchClarify = useExtensionStore((s) => s.requestResearchClarify);
  const submitResearch = useExtensionStore((s) => s.submitResearch);

  const [step, setStep] = useState<WizardStep>("topic");
  const [topicInput, setTopicInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowResearchWizard(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setShowResearchWizard]);

  // Reset step when modal opens
  useEffect(() => {
    if (showResearchWizard) {
      // If we already have a topic from the extension, start at describing
      const storeTopic = useExtensionStore.getState().researchTopic;
      if (storeTopic) {
        setTopicInput(storeTopic);
        setStep("describing");
      } else {
        setStep("topic");
        setTopicInput("");
      }
      setDescriptionInput("");
      setProjectName("");
      setLoading(false);

      // If questions were pre-loaded, start at clarifying
      const storeQuestions = useExtensionStore.getState().researchClarifyingQuestions;
      const storeSuggestedName = useExtensionStore.getState().researchSuggestedName;
      if (storeQuestions.length > 0) {
        setProjectName(storeSuggestedName);
        setStep("clarifying");
      }
    }
  }, [showResearchWizard]);

  // Watch for clarifying questions arriving
  useEffect(() => {
    if (step === "loading_questions" && !researchWizardLoading) {
      if (researchClarifyingQuestions.length > 0) {
        setProjectName(researchSuggestedName);
        setStep("clarifying");
      } else {
        // No questions — skip to naming
        setProjectName(researchSuggestedName || topicInput);
        setStep("naming");
      }
    }
  }, [step, researchWizardLoading, researchClarifyingQuestions, researchSuggestedName, topicInput]);

  const handleTopicSubmit = useCallback(() => {
    if (!topicInput.trim()) return;
    setResearchTopic(topicInput.trim());
    setStep("describing");
  }, [topicInput, setResearchTopic]);

  const handleDescriptionSubmit = useCallback(() => {
    setResearchDescription(descriptionInput.trim());
    setStep("loading_questions");
    setResearchWizardLoading(true);
    requestResearchClarify(topicInput.trim(), descriptionInput.trim());
  }, [topicInput, descriptionInput, setResearchDescription, setResearchWizardLoading, requestResearchClarify]);

  const handleClarifySubmit = useCallback((answers: Record<string, string>) => {
    setProjectName(researchSuggestedName || topicInput);
    // Store answers temporarily and go to naming
    (window as unknown as Record<string, unknown>).__researchAnswers = answers;
    setStep("naming");
  }, [researchSuggestedName, topicInput]);

  const handleClarifyBack = useCallback(() => {
    setStep("describing");
  }, []);

  const handleNameSubmit = useCallback(() => {
    if (!projectName.trim()) return;
    setLoading(true);
    setStep("starting");
    const answers = ((window as unknown as Record<string, unknown>).__researchAnswers || {}) as Record<string, string>;
    delete (window as unknown as Record<string, unknown>).__researchAnswers;
    submitResearch(topicInput.trim(), descriptionInput.trim(), projectName.trim(), answers);
  }, [projectName, topicInput, descriptionInput, submitResearch]);

  if (!showResearchWizard || isResearching) return null;

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

      {/* Modal content */}
      <motion.div
        className="relative max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl bg-[var(--bg-deep)] border border-[var(--border-default)] shadow-2xl"
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
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
              <span>Research Wizard</span>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator step={step} />

          <AnimatePresence mode="wait">
            {/* Step 1: Topic input */}
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
                  What would you like to research?
                </h2>
                <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                  Enter a topic or product idea to explore.
                </p>

                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTopicSubmit(); }}
                  placeholder="e.g. AI-powered code review tool"
                  autoFocus
                  className="w-full px-4 py-3.5 hud-input rounded-lg text-sm"
                />

                <motion.button
                  onClick={handleTopicSubmit}
                  disabled={!topicInput.trim()}
                  className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  whileHover={topicInput.trim() ? { scale: 1.01 } : {}}
                  whileTap={topicInput.trim() ? { scale: 0.98 } : {}}
                >
                  Initialize
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              </motion.div>
            )}

            {/* Step 2: Description */}
            {step === "describing" && (
              <motion.div
                key="describing"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="space-y-4"
              >
                {/* Back link */}
                <button
                  onClick={() => setStep("topic")}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono-hud text-xs uppercase tracking-wider"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>

                {/* Topic badge */}
                <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
                  <span>Topic</span>
                  <span className="text-[var(--text-primary)] truncate max-w-[200px] normal-case tracking-normal">{topicInput}</span>
                </div>

                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Define Your Target
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Describe what you want to build or explore. This helps focus the research.
                </p>

                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="A tool that automatically reviews pull requests using AI..."
                  rows={3}
                  autoFocus
                  className="w-full px-4 py-3.5 hud-input rounded-lg text-sm resize-none"
                />

                <motion.button
                  onClick={handleDescriptionSubmit}
                  className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
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
                <div className="text-center space-y-1.5">
                  <p className="font-mono-hud text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                    Preparing questions
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Analyzing your topic to generate clarifying questions...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Clarifying questions */}
            {step === "clarifying" && researchClarifyingQuestions.length > 0 && (
              <motion.div
                key="clarifying"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
              >
                <ClarifyingQuestions
                  topic={topicInput || researchTopic}
                  questions={researchClarifyingQuestions}
                  loading={loading}
                  onSubmit={handleClarifySubmit}
                  onBack={handleClarifyBack}
                  submitLabel="Deploy Research"
                  badgeLabel="Research"
                />
              </motion.div>
            )}

            {/* Naming step */}
            {step === "naming" && (
              <motion.div
                key="naming"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="space-y-4"
              >
                {/* Back link */}
                <button
                  onClick={() => {
                    if (researchClarifyingQuestions.length > 0) {
                      setStep("clarifying");
                    } else {
                      setStep("describing");
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono-hud text-xs uppercase tracking-wider"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>

                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Name Your Project
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Choose a name for your research project.
                </p>

                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
                  placeholder="My Research Project"
                  autoFocus
                  className="w-full px-4 py-3.5 hud-input rounded-lg text-sm"
                />

                <motion.button
                  onClick={handleNameSubmit}
                  disabled={!projectName.trim()}
                  className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  whileHover={projectName.trim() ? { scale: 1.01 } : {}}
                  whileTap={projectName.trim() ? { scale: 0.98 } : {}}
                >
                  Deploy Research
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
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
                <svg className="w-8 h-8 text-[var(--accent-green)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="font-mono-hud text-sm text-[var(--accent-green)] uppercase tracking-wider">
                  Research started
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
