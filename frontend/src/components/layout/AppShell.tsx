import { PhaseNav } from "./PhaseNav";
import { Sidebar } from "./Sidebar";
import { FloatingProgress } from "./FloatingProgress";
import { ProjectCanvas } from "../canvas/ProjectCanvas";
import { ArtifactDetail } from "../artifacts/ArtifactDetail";
import { useProjectStore } from "../../stores/projectStore";
import { useWebSocket } from "../../hooks/useWebSocket";

export function AppShell() {
  const { project } = useProjectStore();
  useWebSocket(project?.id ?? null);

  return (
    <div className="h-screen flex flex-col bg-[#0f0f1a]">
      <PhaseNav />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <ProjectCanvas />
        </main>
      </div>
      <ArtifactDetail />
      <FloatingProgress />
    </div>
  );
}
