import { useState, useRef } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { videoApi } from "../../api/video";
import type { Artifact } from "../../types";

export function VideoExport() {
  const { project, addArtifact } = useProjectStore();
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const addedRef = useRef(false);

  const handleExport = async () => {
    if (!project) return;
    setStatus("generating");
    addedRef.current = false;
    try {
      await videoApi.generate(project.id);
      // Poll for completion
      const poll = setInterval(async () => {
        const result = await videoApi.getStatus(project.id);
        if (result.status === "complete" && result.url) {
          clearInterval(poll);
          setStatus("done");

          if (!addedRef.current) {
            addedRef.current = true;
            const fullUrl = result.url.startsWith("http")
              ? result.url
              : `${import.meta.env.VITE_API_URL || ""}${result.url}`;
            const videoArtifact: Artifact = {
              id: `vid_${project.id.slice(0, 4)}`,
              project_id: project.id,
              phase: "research",
              type: "video",
              title: "Research Video",
              content: "",
              summary: "Generated video summary of research findings",
              source_url: fullUrl,
              importance: 100,
              group_id: null,
              position_x: 0,
              position_y: 0,
              metadata: {},
              references: [],
              created_at: new Date().toISOString(),
            };
            addArtifact(videoArtifact);
          }
        } else if (result.status === "error") {
          setStatus("error");
          clearInterval(poll);
        }
      }, 2000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="p-3 border-t border-[#3a3a4e]">
      <button
        onClick={handleExport}
        disabled={status === "generating"}
        className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
      >
        {status === "generating" ? "Generating Video..." : "Export Video"}
      </button>
      {status === "done" && (
        <p className="mt-2 text-xs text-purple-400 text-center">
          Video added to canvas
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-400 text-center">Video generation failed</p>
      )}
    </div>
  );
}
