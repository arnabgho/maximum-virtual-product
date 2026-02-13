import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { ClarifyingQuestions } from "./components/home/ClarifyingQuestions";
import { useProjectStore } from "./stores/projectStore";
import { researchApi } from "./api/research";
import type { ClarifyingQuestion } from "./types";

type HomeState = "idle" | "describing" | "loading_questions" | "clarifying" | "starting";

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

export default function App() {
  const { project, projects, createProject, listProjects, openProject, deleteProject, setResearching, setResearchContext } =
    useProjectStore();
  const [inputValue, setInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [homeState, setHomeState] = useState<HomeState>("idle");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);

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
      setHomeState("clarifying");
    } catch (e) {
      console.error("Failed to get clarifying questions:", e);
      // Fallback: skip questions and create project directly
      const proj = await createProject(inputValue.trim());
      setResearching(true, inputValue.trim());
      await researchApi.start(proj.id, inputValue.trim());
      setInputValue("");
      setDescription("");
      setHomeState("idle");
    }
  }, [inputValue, description, createProject, setResearching]);

  const handleClarifySubmit = useCallback(
    async (answers: Record<string, string>) => {
      setHomeState("starting");
      setResearchContext(answers);
      try {
        const proj = await createProject(inputValue.trim());
        setResearching(true, inputValue.trim());
        await researchApi.start(proj.id, inputValue.trim(), answers);
      } catch (e) {
        console.error("Failed to start research:", e);
        setHomeState("clarifying");
      }
    },
    [inputValue, createProject, setResearching, setResearchContext]
  );

  const handleBack = useCallback(() => {
    if (homeState === "clarifying" || homeState === "starting") {
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
  const isStep3 = homeState === "clarifying" || homeState === "starting";

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="max-w-lg w-full p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Maximum Virtual Product
          </h1>
          <p className="text-zinc-400 mb-6">
            AI-powered research and product blueprint system
          </p>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isStep1
                  ? "bg-indigo-500 ring-2 ring-indigo-500/30"
                  : "bg-indigo-500"
              }`}
            />
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isStep2
                  ? "bg-indigo-500 ring-2 ring-indigo-500/30"
                  : isStep3
                    ? "bg-indigo-500"
                    : "bg-zinc-700"
              }`}
            />
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isStep3
                  ? "bg-indigo-500 ring-2 ring-indigo-500/30"
                  : "bg-zinc-700"
              }`}
            />
          </div>

          <AnimatePresence mode="wait">
            {isStep1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="space-y-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContinueToDescribe()}
                    placeholder="Enter your project or research topic..."
                    className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#3a3a4e] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleContinueToDescribe}
                    disabled={!inputValue.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>

                {projects.length > 0 && (
                  <div className="mt-10">
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      Recent Projects
                    </h2>
                    <div className="space-y-2">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3 bg-[#1e1e2e] border border-[#3a3a4e] rounded-lg hover:border-indigo-500/50 transition-colors group"
                        >
                          <button
                            onClick={() => openProject(p.id)}
                            className="flex-1 text-left min-w-0"
                          >
                            <span className="text-white font-medium truncate block">
                              {p.title}
                            </span>
                            <span className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  p.phase === "plan"
                                    ? "bg-emerald-600/20 text-emerald-400"
                                    : "bg-indigo-600/20 text-indigo-400"
                                }`}
                              >
                                {p.phase}
                              </span>
                              {timeAgo(p.created_at)}
                            </span>
                          </button>
                          {deletingId === p.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="text-xs px-2 py-1 text-zinc-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(p.id)}
                              className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Delete project"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projects.length === 0 && (
                  <p className="mt-10 text-center text-zinc-600 text-sm">
                    No projects yet. Create one above to get started.
                  </p>
                )}
              </motion.div>
            )}
            {isStep2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="space-y-4">
                  <div className="text-sm text-zinc-500 bg-[#1e1e2e] px-3 py-1.5 rounded inline-block">
                    {inputValue}
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    What do you want to build?
                  </h2>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your idea — what it does, who it's for, what makes it unique..."
                    className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#3a3a4e] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-y"
                    disabled={homeState === "loading_questions"}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleBack}
                      disabled={homeState === "loading_questions"}
                      className="px-4 py-3 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleDescribeSubmit}
                      disabled={homeState === "loading_questions"}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {homeState === "loading_questions" ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Preparing questions...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            {isStep3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ClarifyingQuestions
                  topic={inputValue}
                  questions={questions}
                  loading={homeState === "starting"}
                  onSubmit={handleClarifySubmit}
                  onBack={handleBack}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
