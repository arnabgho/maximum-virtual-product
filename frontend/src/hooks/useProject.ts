import { useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";

export function useProject(projectId: string | null) {
  const store = useProjectStore();

  useEffect(() => {
    if (projectId) {
      store.loadProject(projectId);
    }
  }, [projectId]);

  return store;
}
