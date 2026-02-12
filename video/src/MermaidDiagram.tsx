import { useEffect, useState, useRef, useId } from "react";
import { delayRender, continueRender, useCurrentFrame, interpolate } from "remotion";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  content: string;
  startFrame: number;
  duration: number;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#1e1e2e",
    primaryColor: "#6366f1",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#818cf8",
    secondaryColor: "#4f46e5",
    tertiaryColor: "#312e81",
    lineColor: "#818cf8",
    textColor: "#e2e8f0",
    mainBkg: "#6366f1",
    nodeBorder: "#818cf8",
    clusterBkg: "#1e1e2e",
    clusterBorder: "#4f46e5",
    titleColor: "#e2e8f0",
    edgeLabelBackground: "#1e1e2e",
    nodeTextColor: "#ffffff",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
  },
  fontSize: 16,
});

export function MermaidDiagram({ content, startFrame, duration }: MermaidDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [handle] = useState(() => delayRender("Rendering mermaid diagram"));
  const uniqueId = useId().replace(/:/g, "-");
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const { svg } = await mermaid.render(`mermaid-${uniqueId}`, content);
        if (!cancelled) {
          setSvgHtml(svg);
          continueRender(handle);
        }
      } catch (err) {
        console.error("Mermaid render failed:", err);
        if (!cancelled) {
          // Fallback: show raw content
          setSvgHtml(null);
          continueRender(handle);
        }
      }
    }

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [content, handle, uniqueId]);

  const opacity = interpolate(relativeFrame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!svgHtml) {
    // Fallback: show raw code in a code block style
    return (
      <div
        style={{
          opacity,
          width: "100%",
          padding: "40px",
          background: "#1e1e2e",
          borderRadius: 16,
          border: "1px solid #6366f1",
          fontFamily: "monospace",
          fontSize: 18,
          color: "#a1a1aa",
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          maxHeight: 600,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        opacity,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
