import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, TLComponents } from "tldraw";
import "tldraw/tldraw.css";
import { ArtifactShapeUtil } from "./shapes/ArtifactShapeUtil";
import { GroupShapeUtil } from "./shapes/GroupShapeUtil";
import { useProjectStore } from "../../stores/projectStore";
import { syncCanvasState, zoomToFit } from "./utils/canvasOperations";

const customShapeUtils = [ArtifactShapeUtil, GroupShapeUtil];

// Hide default tldraw UI elements we don't need
const components: TLComponents = {
  ContextMenu: null,
  ActionsMenu: null,
  HelpMenu: null,
  MainMenu: null,
  PageMenu: null,
  DebugMenu: null,
  DebugPanel: null,
};

export function ProjectCanvas() {
  const editorRef = useRef<Editor | null>(null);
  const { project, artifacts, groups, connections } = useProjectStore();

  const phaseArtifacts = artifacts.filter((a) => a.phase === project?.phase);
  const phaseGroups = groups.filter((g) => g.phase === project?.phase);

  // Sync canvas when data changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !project) return;

    syncCanvasState(editor, phaseArtifacts, phaseGroups, connections);

    // Zoom to fit if we have content
    if (phaseArtifacts.length > 0) {
      // Small delay to let shapes render
      setTimeout(() => zoomToFit(editor), 100);
    }
  }, [phaseArtifacts.length, phaseGroups.length, connections.length, project?.phase]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Set dark theme
      editor.user.updateUserPreferences({ colorScheme: "dark" });

      // Sync initial state
      if (project) {
        syncCanvasState(editor, phaseArtifacts, phaseGroups, connections);
        if (phaseArtifacts.length > 0) {
          setTimeout(() => zoomToFit(editor), 200);
        }
      }
    },
    [project?.id, project?.phase]
  );

  return (
    <div className="w-full h-full" style={{ background: "#0f0f1a" }}>
      <Tldraw
        shapeUtils={customShapeUtils}
        components={components}
        onMount={handleMount}
        inferDarkMode
      />
    </div>
  );
}
