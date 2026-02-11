import { create } from "zustand";
import type {
  Project,
  Artifact,
  ArtifactConnection,
  Group,
  Feedback,
  AgentStatus,
  Phase,
} from "../types";
import { api } from "../api/client";

interface ProjectStore {
  // State
  project: Project | null;
  artifacts: Artifact[];
  connections: ArtifactConnection[];
  groups: Group[];
  feedback: Feedback[];
  agents: AgentStatus[];
  selectedArtifactId: string | null;
  isResearching: boolean;
  isPlanning: boolean;

  // Actions
  loadProject: (id: string) => Promise<void>;
  createProject: (title: string, description?: string) => Promise<Project>;
  setPhase: (phase: Phase) => Promise<void>;
  setSelectedArtifact: (id: string | null) => void;
  addArtifact: (artifact: Artifact) => void;
  updateArtifactPosition: (id: string, x: number, y: number) => void;
  addConnection: (connection: ArtifactConnection) => void;
  addGroup: (group: Group) => void;
  addFeedback: (fb: Feedback) => void;
  setAgentStatus: (agent: AgentStatus) => void;
  setResearching: (v: boolean) => void;
  setPlanning: (v: boolean) => void;
  reset: () => void;

  // Computed-like helpers
  phaseArtifacts: () => Artifact[];
  phaseGroups: () => Group[];
}

const initialState = {
  project: null,
  artifacts: [],
  connections: [],
  groups: [],
  feedback: [],
  agents: [],
  selectedArtifactId: null,
  isResearching: false,
  isPlanning: false,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  loadProject: async (id: string) => {
    const project = await api.get<Project>(`/api/projects/${id}`);
    const [artifacts, connections, groups, feedback] = await Promise.all([
      api.get<Artifact[]>(`/api/projects/${id}/artifacts`),
      api.get<ArtifactConnection[]>(`/api/projects/${id}/connections`).catch(() => [] as ArtifactConnection[]),
      api.get<Group[]>(`/api/projects/${id}/groups`).catch(() => [] as Group[]),
      api.get<Feedback[]>(`/api/projects/${id}/feedback`).catch(() => [] as Feedback[]),
    ]);
    set({ project, artifacts, connections, groups, feedback });
  },

  createProject: async (title: string, description = "") => {
    const project = await api.post<Project>("/api/projects", { title, description });
    set({ ...initialState, project });
    return project;
  },

  setPhase: async (phase: Phase) => {
    const { project } = get();
    if (!project) return;
    const updated = await api.patch<Project>(`/api/projects/${project.id}`, { phase });
    set({ project: updated });
  },

  setSelectedArtifact: (id) => set({ selectedArtifactId: id }),

  addArtifact: (artifact) =>
    set((s) => ({ artifacts: [...s.artifacts, artifact] })),

  updateArtifactPosition: (id, x, y) =>
    set((s) => ({
      artifacts: s.artifacts.map((a) =>
        a.id === id ? { ...a, position_x: x, position_y: y } : a
      ),
    })),

  addConnection: (connection) =>
    set((s) => ({ connections: [...s.connections, connection] })),

  addGroup: (group) =>
    set((s) => ({ groups: [...s.groups, group] })),

  addFeedback: (fb) =>
    set((s) => ({ feedback: [...s.feedback, fb] })),

  setAgentStatus: (agent) =>
    set((s) => {
      const existing = s.agents.findIndex((a) => a.agent_id === agent.agent_id);
      if (existing >= 0) {
        const updated = [...s.agents];
        updated[existing] = agent;
        return { agents: updated };
      }
      return { agents: [...s.agents, agent] };
    }),

  setResearching: (v) => set({ isResearching: v }),
  setPlanning: (v) => set({ isPlanning: v }),

  reset: () => set(initialState),

  phaseArtifacts: () => {
    const { project, artifacts } = get();
    if (!project) return [];
    return artifacts.filter((a) => a.phase === project.phase);
  },

  phaseGroups: () => {
    const { project, groups } = get();
    if (!project) return [];
    return groups.filter((g) => g.phase === project.phase);
  },
}));
