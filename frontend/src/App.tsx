import { useState, useCallback } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { Project } from "./types";
import { useProjectStore } from "./stores/projectStore";

export default function App() {
  const { project, createProject } = useProjectStore();
  const [inputValue, setInputValue] = useState("");

  const handleCreateProject = useCallback(async () => {
    if (!inputValue.trim()) return;
    await createProject(inputValue.trim());
    setInputValue("");
  }, [inputValue, createProject]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="max-w-lg w-full p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Maximum Virtual Product</h1>
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
        </div>
      </div>
    );
  }

  return <AppShell />;
}
