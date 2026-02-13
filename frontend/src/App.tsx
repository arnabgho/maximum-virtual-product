import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { ClarifyingQuestions } from "./components/home/ClarifyingQuestions";
import { useProjectStore } from "./stores/projectStore";
import { researchApi } from "./api/research";
import type { ClarifyingQuestion } from "./types";

type HomeState = "idle" | "describing" | "loading_questions" | "clarifying" | "naming" | "starting";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const stepTransition = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(6px)" },
  transition: { duration: 0.45, ease },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function StepIndicator({ isStep1, isStep2, isStep3 }: { isStep1: boolean; isStep2: boolean; isStep3: boolean }) {
  const steps = [
    { label: "01", active: isStep1, completed: isStep2 || isStep3 },
    { label: "02", active: isStep2, completed: isStep3 },
    { label: "03", active: isStep3, completed: false },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono-hud text-xs font-bold transition-all duration-300 ${
              step.completed
                ? "bg-[var(--accent-cyan)] text-black"
                : step.active
                  ? "hud-btn-primary text-[var(--accent-cyan)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-dim)]"
            }`}
          >
            {step.completed ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              step.label
            )}
          </div>
          {i < 2 && (
            <div className="relative w-16 h-[1px] mx-1">
              <div className="absolute inset-0 bg-[var(--border-dim)]" />
              <motion.div
                className="absolute inset-y-0 left-0 bg-[var(--accent-cyan)]"
                initial={false}
                animate={{ width: step.completed ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBar() {
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setUptime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = uptime % 60;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-[var(--bg-surface)] border-t border-[var(--border-dim)] flex items-center px-4 gap-6 z-20 font-mono-hud text-[10px]">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] pulse-dot" />
        <span className="text-[var(--accent-green)] uppercase tracking-widest">System_Live</span>
      </span>
      <span className="text-[var(--text-muted)]">|</span>
      <span className="text-[var(--text-secondary)] uppercase tracking-wider">Uptime {pad(h)}:{pad(m)}:{pad(s)}</span>
      <span className="text-[var(--text-muted)]">|</span>
      <span className="text-[var(--text-secondary)] uppercase tracking-wider">v2.0.0</span>
      <span className="ml-auto text-[var(--text-muted)] uppercase tracking-wider">&copy; Maximum Virtual Blueprint</span>
    </div>
  );
}

export default function App() {
  const { project, projects, createProject, listProjects, openProject, deleteProject, setResearching, setResearchContext } =
    useProjectStore();
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [homeState, setHomeState] = useState<HomeState>("idle");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    listProjects();
  }, [listProjects]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project");
    if (projectId && !project) {
      openProject(projectId);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [openProject, project]);

  const handleContinueToDescribe = useCallback(() => {
    if (!inputValue.trim()) return;
    setHomeState("describing");
  }, [inputValue]);

  const handleDescribeSubmit = useCallback(async () => {
    setHomeState("loading_questions");
    try {
      const result = await researchApi.clarify(inputValue.trim(), description.trim());
      setQuestions(result.questions);
      setProjectName(result.suggested_name || inputValue.trim());
      setHomeState("clarifying");
    } catch (e) {
      console.error("Failed to get clarifying questions:", e);
      const proj = await createProject(inputValue.trim());
      setResearching(true, inputValue.trim());
      await researchApi.start(proj.id, inputValue.trim());
      setInputValue("");
      setDescription("");
      setHomeState("idle");
    }
  }, [inputValue, description, createProject, setResearching]);

  const handleClarifySubmit = useCallback(
    (answers: Record<string, string>) => {
      setClarifyAnswers(answers);
      setResearchContext(answers);
      setHomeState("naming");
    },
    [setResearchContext]
  );

  const handleDeployResearch = useCallback(
    async () => {
      setHomeState("starting");
      try {
        const proj = await createProject(projectName.trim() || inputValue.trim());
        setResearching(true, inputValue.trim());
        await researchApi.start(proj.id, inputValue.trim(), clarifyAnswers);
      } catch (e) {
        console.error("Failed to start research:", e);
        setHomeState("naming");
      }
    },
    [inputValue, projectName, clarifyAnswers, createProject, setResearching]
  );

  const handleBack = useCallback(() => {
    if (homeState === "naming") {
      setHomeState("clarifying");
    } else if (homeState === "clarifying" || homeState === "starting") {
      setHomeState("describing");
      setQuestions([]);
    } else if (homeState === "describing" || homeState === "loading_questions") {
      setHomeState("idle");
    }
  }, [homeState]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProject(id);
      setDeletingId(null);
    },
    [deleteProject]
  );

  const isStep1 = homeState === "idle";
  const isStep2 = homeState === "describing" || homeState === "loading_questions";
  const isStep3 = homeState === "clarifying" || homeState === "naming" || homeState === "starting";

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] relative pb-7">
        {/* Background layers */}
        <div className="grid-bg" />
        <div className="ambient-glow" />
        <div className="scan-line" />
        <div className="noise-overlay" />

        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 h-10 bg-[var(--bg-surface)]/80 backdrop-blur-sm border-b border-[var(--border-dim)] flex items-center px-5 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[var(--accent-cyan)] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              </svg>
            </div>
            <span className="font-mono-hud text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">MVB</span>
            <span className="font-mono-hud text-[10px] text-[var(--text-muted)] tracking-wider">v2.0</span>
          </div>
          <div className="ml-auto">
            {showProjects ? (
              <button
                onClick={() => setShowProjects(false)}
                className="flex items-center gap-1.5 font-mono-hud text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] uppercase tracking-wider transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                New Research
              </button>
            ) : projects.length > 0 ? (
              <button
                onClick={() => setShowProjects(true)}
                className="badge-cyan font-mono-hud text-[10px] px-2 py-0.5 rounded uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
              >
                Projects {projects.length}
              </button>
            ) : null}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showProjects ? (
            <motion.div
              key="projects"
              className="max-w-2xl w-full px-8 py-12 relative z-10 mt-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[var(--border-default)]" />
                <h2 className="font-mono-hud text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.25em] shrink-0">
                  Active_Projects
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[var(--border-default)]" />
              </div>

              {projects.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] font-mono-hud text-xs uppercase tracking-wider py-12">
                  No active projects yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map((p, index) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.3, ease }}
                      className="hud-card hud-corners rounded-lg overflow-hidden transition-all group"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => openProject(p.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-mono-hud text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                p.phase === "plan"
                                  ? "badge-green"
                                  : "badge-cyan"
                              }`}
                            >
                              {p.phase === "plan" ? "DEPLOYED" : "SYNC_READY"}
                            </span>
                            <span className="font-mono-hud text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                              {timeAgo(p.created_at)}
                            </span>
                          </div>
                          <span className="text-[var(--text-primary)] font-semibold text-sm truncate block">
                            {p.title}
                          </span>
                        </button>
                        {deletingId === p.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="font-mono-hud text-[10px] px-2.5 py-1 badge-red rounded hover:opacity-80 transition-opacity uppercase tracking-wider"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(p.id)}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-red)] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Delete project"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="wizard"
              className="max-w-xl w-full px-8 py-12 relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease }}
            >
              {/* Hub / Logo */}
              <div className="flex items-center gap-5 mb-10">
                <motion.div
                  className="relative w-20 h-20 shrink-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease }}
                >
                  <div className="absolute inset-0 rounded-full border border-[var(--accent-cyan)]/20 pulse-glow" />
                  <div
                    className="absolute inset-0 rounded-full border border-dashed border-[var(--accent-cyan)]/10"
                    style={{ animation: "ring-rotate 20s linear infinite" }}
                  />
                  <div className="absolute inset-3 rounded-full bg-[var(--bg-surface)] border border-[var(--accent-cyan)]/30 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                      <line x1="12" y1="22" x2="12" y2="15.5" />
                      <polyline points="22 8.5 12 15.5 2 8.5" />
                    </svg>
                  </div>
                </motion.div>

                <div>
                  <motion.h1
                    className="font-mono-hud text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease }}
                  >
                    <span className="text-glow">MAXIMUM VIRTUAL BLUEPRINT</span>
                  </motion.h1>
                  <motion.p
                    className="font-mono-hud text-xs text-[var(--accent-cyan)] uppercase tracking-[0.3em]"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease }}
                  >
                    AI Research Core
                  </motion.p>
                </div>
              </div>

              {/* Step indicator */}
              <StepIndicator isStep1={isStep1} isStep2={isStep2} isStep3={isStep3} />

              <AnimatePresence mode="wait">
                {isStep1 && (
                  <motion.div key="step1" {...stepTransition}>
                    <div className="space-y-4">
                      <div className="font-mono-hud text-[10px] text-[var(--accent-cyan)] uppercase tracking-wider select-none mb-1">
                        Query &gt;
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleContinueToDescribe()}
                          placeholder="What would you like to research?"
                          className="w-full px-4 pr-16 py-4 hud-input rounded-lg font-mono-hud text-sm"
                        />
                        {inputValue.trim() && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-hud text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-dim)]"
                          >
                            ENTER &crarr;
                          </motion.span>
                        )}
                      </div>

                      <motion.button
                        onClick={handleContinueToDescribe}
                        disabled={!inputValue.trim()}
                        className="w-full py-4 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                        whileHover={inputValue.trim() ? { scale: 1.01 } : {}}
                        whileTap={inputValue.trim() ? { scale: 0.98 } : {}}
                      >
                        Initialize
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {isStep2 && (
                  <motion.div key="step2" {...stepTransition}>
                    <div className="space-y-4">
                      {/* Topic badge */}
                      <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
                        <span className="truncate max-w-[300px]">{inputValue}</span>
                      </div>

                      <h2 className="font-mono-hud text-xl font-bold tracking-tight text-[var(--text-primary)]">
                        Define Your Target
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Describe your idea — what it does, who it's for, what makes it unique.
                      </p>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your vision..."
                        className="w-full px-4 py-4 hud-input rounded-lg text-sm min-h-[120px] resize-y"
                        disabled={homeState === "loading_questions"}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleBack}
                          disabled={homeState === "loading_questions"}
                          className="px-5 py-3.5 hud-btn-ghost rounded-lg font-mono-hud text-xs uppercase tracking-wider disabled:opacity-50"
                        >
                          Back
                        </button>
                        <motion.button
                          onClick={handleDescribeSubmit}
                          disabled={homeState === "loading_questions"}
                          className="flex-1 py-3.5 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                          whileHover={homeState !== "loading_questions" ? { scale: 1.01 } : {}}
                          whileTap={homeState !== "loading_questions" ? { scale: 0.98 } : {}}
                        >
                          {homeState === "loading_questions" ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              Continue
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isStep3 && (
                  <motion.div key="step3" {...stepTransition}>
                    {homeState === "naming" || homeState === "starting" ? (
                      <div className="space-y-5">
                        <div className="inline-flex items-center gap-2 badge-cyan rounded px-3 py-1.5 font-mono-hud text-[10px] uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] pulse-dot" />
                          <span className="truncate max-w-[300px]">{inputValue}</span>
                        </div>

                        <h2 className="font-mono-hud text-xl font-bold tracking-tight text-[var(--text-primary)]">
                          Name Your Project
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                          We generated a name based on your inputs. Edit it or launch as-is.
                        </p>

                        <div>
                          <div className="font-mono-hud text-[10px] text-[var(--accent-cyan)] uppercase tracking-wider select-none mb-1">
                            Name &gt;
                          </div>
                          <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && projectName.trim() && handleDeployResearch()}
                            className="w-full px-4 py-4 hud-input rounded-lg font-mono-hud text-sm"
                            disabled={homeState === "starting"}
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleBack}
                            disabled={homeState === "starting"}
                            className="px-5 py-3.5 hud-btn-ghost rounded-lg font-mono-hud text-xs uppercase tracking-wider disabled:opacity-50"
                          >
                            Back
                          </button>
                          <motion.button
                            onClick={handleDeployResearch}
                            disabled={!projectName.trim() || homeState === "starting"}
                            className="flex-1 py-3.5 hud-btn-primary rounded-lg font-mono-hud text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                            whileHover={projectName.trim() && homeState !== "starting" ? { scale: 1.01 } : {}}
                            whileTap={projectName.trim() && homeState !== "starting" ? { scale: 0.98 } : {}}
                          >
                            {homeState === "starting" ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Deploying...
                              </>
                            ) : (
                              <>
                                Deploy Research
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                  <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <ClarifyingQuestions
                        topic={inputValue}
                        questions={questions}
                        loading={false}
                        onSubmit={handleClarifySubmit}
                        onBack={handleBack}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status bar */}
        <StatusBar />
      </div>
    );
  }

  return <AppShell />;
}
