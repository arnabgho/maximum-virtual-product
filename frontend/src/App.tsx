import { useState, useCallback, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { useProjectStore } from "./stores/projectStore";

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
  const { project, projects, createProject, listProjects, openProject, deleteProject } =
    useProjectStore();
  const [inputValue, setInputValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listProjects();
  }, [listProjects]);

  const handleCreateProject = useCallback(async () => {
    if (!inputValue.trim()) return;
    await createProject(inputValue.trim());
    setInputValue("");
  }, [inputValue, createProject]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProject(id);
      setDeletingId(null);
    },
    [deleteProject]
  );

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="max-w-lg w-full p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Maximum Virtual Product
          </h1>
          <p className="text-zinc-400 mb-8">
            AI-powered research and product blueprint system
          </p>
          <div className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
              placeholder="Enter your project or research topic..."
              className="w-full px-4 py-3 bg-[#1e1e2e] border border-[#3a3a4e] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCreateProject}
              disabled={!inputValue.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Start Project
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
        </div>
      </div>
    );
  }

  return <AppShell />;
}
