import { create } from "zustand";
import type {
  Project,
  Artifact,
  ArtifactConnection,
  Group,
  Feedback,
  AgentStatus,
  Phase,
  ClarifyingQuestion,
  PlanDirection,
} from "../types";
import { api } from "../api/client";

interface ProjectStore {
  // State
  projects: Project[];
  project: Project | null;
  artifacts: Artifact[];
  connections: ArtifactConnection[];
  groups: Group[];
  feedback: Feedback[];
  agents: AgentStatus[];
  selectedArtifactId: string | null;
  isResearching: boolean;
  isPlanning: boolean;
  researchQuery: string;
  planDescription: string;
  imageGenerationProgress: { total: number; completed: number } | null;
  isRegenerating: string | null; // artifact ID being regenerated
  clarifyingQuestions: ClarifyingQuestion[];
  planDirections: PlanDirection[];
  researchContext: Record<string, string>;
  researchDirections: { angle: string; sub_query: string }[];
  planClarifyingQuestions: ClarifyingQuestion[];
  planContext: Record<string, string>;
  selectedDirection: PlanDirection | null;
  planClarifyLoading: boolean;

  // Actions
  listProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (title: string, description?: string) => Promise<Project>;
  setPhase: (phase: Phase) => Promise<void>;
  setSelectedArtifact: (id: string | null) => void;
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifact: Artifact) => void;
  updateArtifactImage: (artifactId: string, imageUrl: string) => void;
  updateArtifactPosition: (id: string, x: number, y: number) => void;
  addConnection: (connection: ArtifactConnection) => void;
  addGroup: (group: Group) => void;
  addFeedback: (fb: Feedback) => void;
  markFeedbackAddressed: (artifactId: string) => void;
  setAgentStatus: (agent: AgentStatus) => void;
  setResearching: (v: boolean, query?: string) => void;
  setPlanning: (v: boolean, description?: string) => void;
  setImageGenerationProgress: (total: number | null) => void;
  incrementImageGeneration: () => void;
  setRegenerating: (artifactId: string | null) => void;
  setClarifyingQuestions: (questions: ClarifyingQuestion[]) => void;
  setPlanDirections: (directions: PlanDirection[]) => void;
  updateProjectTitle: (id: string, title: string) => Promise<void>;
  setResearchContext: (context: Record<string, string>) => void;
  setResearchDirections: (directions: { angle: string; sub_query: string }[]) => void;
  setPlanClarifyingQuestions: (questions: ClarifyingQuestion[]) => void;
  setPlanContext: (context: Record<string, string>) => void;
  setSelectedDirection: (direction: PlanDirection | null) => void;
  setPlanClarifyLoading: (v: boolean) => void;
  reset: () => void;

  // Computed-like helpers
  phaseArtifacts: () => Artifact[];
  phaseGroups: () => Group[];
}

const initialState = {
  projects: [] as Project[],
  project: null as Project | null,
  artifacts: [] as Artifact[],
  connections: [] as ArtifactConnection[],
  groups: [] as Group[],
  feedback: [] as Feedback[],
  agents: [] as AgentStatus[],
  selectedArtifactId: null as string | null,
  isResearching: false,
  isPlanning: false,
  researchQuery: "",
  planDescription: "",
  imageGenerationProgress: null as { total: number; completed: number } | null,
  isRegenerating: null as string | null,
  clarifyingQuestions: [] as ClarifyingQuestion[],
  planDirections: [] as PlanDirection[],
  researchContext: {} as Record<string, string>,
  researchDirections: [] as { angle: string; sub_query: string }[],
  planClarifyingQuestions: [] as ClarifyingQuestion[],
  planContext: {} as Record<string, string>,
  selectedDirection: null as PlanDirection | null,
  planClarifyLoading: false,
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  listProjects: async () => {
    const projects = await api.get<Project[]>("/api/projects");
    set({ projects });
  },

  deleteProject: async (id: string) => {
    await api.delete(`/api/projects/${id}`);
    const { project } = get();
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      ...(project?.id === id ? initialState : {}),
    }));
  },

  openProject: async (id: string) => {
    await get().loadProject(id);
  },

  loadProject: async (id: string) => {
    const project = await api.get<Project>(`/api/projects/${id}`);
    const [artifacts, connections, groups, feedback] = await Promise.all([
      api.get<Artifact[]>(`/api/projects/${id}/artifacts`),
      api.get<ArtifactConnection[]>(`/api/projects/${id}/connections`).catch(() => [] as ArtifactConnection[]),
      api.get<Group[]>(`/api/projects/${id}/groups`).catch(() => [] as Group[]),
      api.get<Feedback[]>(`/api/projects/${id}/feedback`).catch(() => [] as Feedback[]),
    ]);
    set({ project, artifacts, connections, groups, feedback, planDirections: project.plan_directions ?? [] });
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
    set((s) => {
      if (s.artifacts.some((a) => a.id === artifact.id)) return s;
      return { artifacts: [...s.artifacts, artifact] };
    }),

  updateArtifact: (artifact) =>
    set((s) => ({
      artifacts: s.artifacts.map((a) =>
        a.id === artifact.id ? artifact : a
      ),
    })),

  updateArtifactImage: (artifactId, imageUrl) =>
    set((s) => ({
      artifacts: s.artifacts.map((a) =>
        a.id === artifactId ? { ...a, image_url: imageUrl } : a
      ),
    })),

  updateArtifactPosition: (id, x, y) =>
    set((s) => ({
      artifacts: s.artifacts.map((a) =>
        a.id === id ? { ...a, position_x: x, position_y: y } : a
      ),
    })),

  addConnection: (connection) =>
    set((s) => ({
      connections: s.connections.some((c) => c.id === connection.id)
        ? s.connections
        : [...s.connections, connection],
    })),

  addGroup: (group) =>
    set((s) => ({ groups: [...s.groups, group] })),

  addFeedback: (fb) =>
    set((s) => ({ feedback: [...s.feedback, fb] })),

  markFeedbackAddressed: (artifactId) =>
    set((s) => ({
      feedback: s.feedback.map((f) =>
        f.artifact_id === artifactId && f.status === "pending"
          ? { ...f, status: "addressed" as const }
          : f
      ),
    })),

  setAgentStatus: (agent) =>
    set((s) => {
      const existing = s.agents.findIndex((a) => a.agent_id === agent.agent_id);
      if (existing >= 0) {
        const updated = [...s.agents];
        updated[existing] = { ...updated[existing], ...agent };
        return { agents: updated };
      }
      return { agents: [...s.agents, agent] };
    }),

  setResearching: (v, query) =>
    set({ isResearching: v, ...(query !== undefined ? { researchQuery: query } : {}) }),
  setPlanning: (v, description) =>
    set({ isPlanning: v, ...(description !== undefined ? { planDescription: description } : {}), ...(v ? {} : { imageGenerationProgress: null }) }),
  setImageGenerationProgress: (total) =>
    set({ imageGenerationProgress: total != null ? { total, completed: 0 } : null }),
  incrementImageGeneration: () =>
    set((s) => ({
      imageGenerationProgress: s.imageGenerationProgress
        ? { ...s.imageGenerationProgress, completed: s.imageGenerationProgress.completed + 1 }
        : null,
    })),
  setRegenerating: (artifactId) => set({ isRegenerating: artifactId }),
  setClarifyingQuestions: (questions) => set({ clarifyingQuestions: questions }),
  setPlanDirections: (directions) => set({ planDirections: directions }),
  updateProjectTitle: async (id, title) => {
    const updated = await api.patch<Project>(`/api/projects/${id}`, { title });
    set((s) => ({
      project: s.project?.id === id ? { ...s.project, title: updated.title } : s.project,
      projects: s.projects.map((p) => (p.id === id ? { ...p, title: updated.title } : p)),
    }));
  },
  setResearchContext: (context) => set({ researchContext: context }),
  setResearchDirections: (directions) => set({ researchDirections: directions }),
  setPlanClarifyingQuestions: (questions) => set({ planClarifyingQuestions: questions }),
  setPlanContext: (context) => set({ planContext: context }),
  setSelectedDirection: (direction) => set({ selectedDirection: direction }),
  setPlanClarifyLoading: (v) => set({ planClarifyLoading: v }),

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
