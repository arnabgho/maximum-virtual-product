import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExtensionStore } from "../../stores/extensionStore";
import { DesignPreferences } from "./DesignPreferences";
import { ClarifyingQuestions } from "./ClarifyingQuestions";
import type { PlanDirection } from "../../vscodeApi";

type WizardStep =
  | "directions"
  | "loading_design"
  | "design_prefs"
  | "loading_questions"
  | "clarifying"
  | "starting";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function StepIndicator({ step }: { step: WizardStep }) {
  const stepNum =
    step === "directions" ? 0
    : step === "loading_design" || step === "design_prefs" ? 1
    : 2;

  const steps = [
    { label: "01", name: "Direction" },
    { label: "02", name: "Design" },
    { label: "03", name: "Details" },
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

export function PlanWizardModal() {
  const planDirections = useExtensionStore((s) => s.planDirections);
  const designDimensions = useExtensionStore((s) => s.designDimensions);
  const planClarifyingQuestions = useExtensionStore((s) => s.planClarifyingQuestions);
  const wizardLoading = useExtensionStore((s) => s.wizardLoading);
  const isPlanning = useExtensionStore((s) => s.isPlanning);
  const showPlanWizard = useExtensionStore((s) => s.showPlanWizard);
  const setShowPlanWizard = useExtensionStore((s) => s.setShowPlanWizard);
  const setWizardLoading = useExtensionStore((s) => s.setWizardLoading);
  const requestDesignPreferences = useExtensionStore((s) => s.requestDesignPreferences);
  const requestPlanClarify = useExtensionStore((s) => s.requestPlanClarify);
  const submitPlan = useExtensionStore((s) => s.submitPlan);

  const [step, setStep] = useState<WizardStep>("directions");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [designPrefResults, setDesignPrefResults] = useState<Record<string, string>>({});
  const [selectedDirection, setSelectedDirection] = useState<PlanDirection | null>(null);
  const [loading, setLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPlanWizard(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setShowPlanWizard]);

  // Reset step when modal opens
  useEffect(() => {
    if (showPlanWizard) {
      setStep("directions");
      setSelectedIdx(null);
      setUseCustom(false);
      setCustomDescription("");
      setDesignPrefResults({});
      setSelectedDirection(null);
      setLoading(false);
    }
  }, [showPlanWizard]);

  // Watch for design dimensions arriving (response to requestDesignPreferences)
  useEffect(() => {
    if (step === "loading_design" && !wizardLoading) {
      if (designDimensions.length > 0) {
        setStep("design_prefs");
      } else {
        // No dimensions — skip to clarifying questions
        if (selectedDirection) {
          setStep("loading_questions");
          setWizardLoading(true);
          requestPlanClarify(selectedDirection);
        }
      }
    }
  }, [step, wizardLoading, designDimensions, selectedDirection, setWizardLoading, requestPlanClarify]);

  // Watch for clarifying questions arriving (response to requestPlanClarify)
  useEffect(() => {
    if (step === "loading_questions" && !wizardLoading) {
      if (planClarifyingQuestions.length > 0) {
        setStep("clarifying");
      } else {
        // No questions — start plan directly
        if (selectedDirection) {
          handleStartPlan(selectedDirection, {});
        }
      }
    }
  }, [step, wizardLoading, planClarifyingQuestions, selectedDirection]);

  const handleSelectDirection = useCallback((direction: PlanDirection) => {
    setSelectedDirection(direction);
    setStep("loading_design");
    setWizardLoading(true);
    requestDesignPreferences(direction);
  }, [setWizardLoading, requestDesignPreferences]);

  const handleDesignSubmit = useCallback((prefs: Record<string, string>) => {
    setDesignPrefResults(prefs);
    if (selectedDirection) {
      setStep("loading_questions");
      setWizardLoading(true);
      requestPlanClarify(selectedDirection);
    }
  }, [selectedDirection, setWizardLoading, requestPlanClarify]);

  const handleDesignSkip = useCallback(() => {
    setDesignPrefResults({});
    if (selectedDirection) {
      setStep("loading_questions");
      setWizardLoading(true);
      requestPlanClarify(selectedDirection);
    }
  }, [selectedDirection, setWizardLoading, requestPlanClarify]);

  const handleDesignBack = useCallback(() => {
    setStep("directions");
  }, []);

  const handleStartPlan = useCallback((direction: PlanDirection, answers: Record<string, string>) => {
    const mergedPrefs = { ...designPrefResults };
    setLoading(true);
    setStep("starting");
    submitPlan(direction, mergedPrefs, answers);
  }, [designPrefResults, submitPlan]);

  const handleClarifySubmit = useCallback((answers: Record<string, string>) => {
    if (!selectedDirection) return;
    handleStartPlan(selectedDirection, answers);
  }, [selectedDirection, handleStartPlan]);

  const handleClarifyBack = useCallback(() => {
    if (designDimensions.length > 0) {
      setStep("design_prefs");
    } else {
      setStep("directions");
    }
  }, [designDimensions]);

  if (!showPlanWizard || isPlanning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowPlanWizard(false)}
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
          onClick={() => setShowPlanWizard(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-dim)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 badge-green rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" />
              <span>Blueprint Wizard</span>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator step={step} />

          <AnimatePresence mode="wait">
            {/* Step 1: Direction selection */}
            {step === "directions" && (
              <motion.div
                key="directions"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                  Choose a Direction
                </h2>
                <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                  Select a strategic approach or write your own.
                </p>

                {planDirections.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm py-8">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating directions...
                  </div>
                ) : (
                  <div className={`grid gap-3 ${planDirections.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {planDirections.map((dir, i) => {
                      const selected = selectedIdx === i && !useCustom;
                      return (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.25 }}
                          onClick={() => { setSelectedIdx(i); setUseCustom(false); }}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            selected
                              ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5 shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                              : "border-[var(--border-dim)] bg-[var(--bg-surface)] hover:border-[var(--border-bright)]"
                          }`}
                        >
                          <p className={`text-sm font-semibold ${selected ? "text-[var(--accent-cyan)]" : "text-[var(--text-primary)]"}`}>
                            {dir.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1.5">{dir.description}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-2 italic font-mono-hud">{dir.key_focus}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {selectedIdx !== null && !useCustom && planDirections[selectedIdx] && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleSelectDirection(planDirections[selectedIdx]!)}
                    className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Build This Plan
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.button>
                )}

                {/* Custom direction */}
                <div className="pt-3 border-t border-[var(--border-dim)]">
                  <button
                    onClick={() => { setUseCustom(true); setSelectedIdx(null); }}
                    className={`text-xs font-medium font-mono-hud transition-colors ${
                      useCustom ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Write your own direction
                  </button>
                  {useCustom && (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Describe your product or project..."
                        rows={3}
                        className="hud-input rounded-lg text-sm resize-none w-full"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (!customDescription.trim()) return;
                          const customDir: PlanDirection = {
                            title: customDescription.trim().slice(0, 60),
                            description: customDescription.trim(),
                            key_focus: "",
                          };
                          handleSelectDirection(customDir);
                        }}
                        disabled={!customDescription.trim()}
                        className="w-full py-3 hud-btn-primary rounded-lg font-mono-hud text-xs uppercase tracking-wider"
                      >
                        Build This Plan
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Loading design */}
            {step === "loading_design" && (
              <motion.div
                key="loading_design"
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
                    Analyzing your direction
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Generating design dimensions & visual options...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Design preferences */}
            {step === "design_prefs" && (
              <motion.div
                key="design_prefs"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
              >
                <DesignPreferences
                  dimensions={designDimensions}
                  onSubmit={handleDesignSubmit}
                  onBack={handleDesignBack}
                  onSkip={handleDesignSkip}
                />
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
                  Preparing questions...
                </p>
              </motion.div>
            )}

            {/* Step 3: Clarifying questions */}
            {step === "clarifying" && planClarifyingQuestions.length > 0 && selectedDirection && (
              <motion.div
                key="clarifying"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
              >
                <ClarifyingQuestions
                  topic={selectedDirection.title}
                  questions={planClarifyingQuestions}
                  loading={loading}
                  onSubmit={handleClarifySubmit}
                  onBack={handleClarifyBack}
                  submitLabel="Generate Blueprint"
                  badgeLabel="Planning"
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
                <svg className="w-8 h-8 text-[var(--accent-green)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="font-mono-hud text-sm text-[var(--accent-green)] uppercase tracking-wider">
                  Blueprint generation started
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
