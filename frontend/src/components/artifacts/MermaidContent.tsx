import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#1e1e2e",
    primaryColor: "#6366f1",
    primaryTextColor: "#e4e4e7",
  },
});

export function MermaidContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, content).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [content]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.25, z - e.deltaY * 0.002)));
    }
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          className="text-xs px-2 py-1 bg-[#2a2a3e] text-zinc-400 rounded hover:text-white"
        >
          -
        </button>
        <span className="text-xs text-zinc-500 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="text-xs px-2 py-1 bg-[#2a2a3e] text-zinc-400 rounded hover:text-white"
        >
          +
        </button>
        {zoom !== 1 && (
          <button
            onClick={() => setZoom(1)}
            className="text-xs px-2 py-1 text-zinc-500 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>
      <div className="overflow-auto max-h-[60vh] rounded border border-[#3a3a4e]" onWheel={handleWheel}>
        <div
          ref={ref}
          className="flex items-center justify-center p-4"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}
