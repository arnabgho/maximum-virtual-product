import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, content).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [content]);

  return <div ref={ref} className="flex items-center justify-center" />;
}
