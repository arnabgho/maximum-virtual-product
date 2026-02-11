import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { videoApi } from "../../api/video";

export function VideoExport() {
  const { project } = useProjectStore();
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleExport = async () => {
    if (!project) return;
    setStatus("generating");
    try {
      await videoApi.generate(project.id);
      // Poll for completion
      const poll = setInterval(async () => {
        const result = await videoApi.getStatus(project.id);
        if (result.status === "complete" && result.url) {
          setVideoUrl(result.url);
          setStatus("done");
          clearInterval(poll);
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
      {status === "done" && videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-xs text-purple-400 hover:underline text-center"
        >
          Download Video
        </a>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-red-400 text-center">Video generation failed</p>
      )}
    </div>
  );
}
