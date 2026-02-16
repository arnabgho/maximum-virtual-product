import { create } from "zustand";
import type {
  Phase,
  Project,
  Artifact,
  ArtifactConnection,
  Group,
  Feedback,
  AgentStatus,
  WSEvent,
  PlanStage,
  PlanDirection,
  DesignDimension,
  ClarifyingQuestion,
} from "../vscodeApi";
import { sendToExtension } from "../vscodeApi";

interface ExtensionStore {
  // State
  project: Project | null;
  displayPhase: Phase | null;
  artifacts: Artifact[];
  connections: ArtifactConnection[];
  groups: Group[];
  feedback: Feedback[];
  agents: AgentStatus[];
  selectedArtifactId: string | null;
  isResearching: boolean;
  isPlanning: boolean;
  reviewMode: boolean;
  reviewArtifactIndex: number;
  reviewPhase: string | null;
  batchRegenerateProgress: {
    total: number;
    completed: number;
    currentArtifactId: string | null;
    failed: number;
  } | null;
  planStages: PlanStage[];
  imageGenerationProgress: { total: number; completed: number } | null;

  // Actions
  setProject: (
    project: Project,
    artifacts: Artifact[],
    connections: ArtifactConnection[],
    groups: Group[],
    feedback: Feedback[],
    displayPhase?: Phase
  ) => void;
  handleWSEvent: (event: WSEvent) => void;
  setSelectedArtifact: (id: string | null) => void;
  setReviewMode: (v: boolean) => void;
  setReviewArtifactIndex: (i: number) => void;
  updateArtifactPosition: (id: string, x: number, y: number) => void;
  setFeedback: (feedback: Feedback[]) => void;
  addFeedback: (fb: Feedback) => void;

  // Plan wizard
  showPlanWizard: boolean;
  planDirections: PlanDirection[];
  designDimensions: DesignDimension[];
  planClarifyingQuestions: ClarifyingQuestion[];
  wizardLoading: boolean;
  setShowPlanWizard: (v: boolean) => void;
  setPlanDirections: (dirs: PlanDirection[]) => void;
  setDesignDimensions: (dims: DesignDimension[]) => void;
  updateDesignOptionImage: (optionId: string, imageUrl: string) => void;
  setPlanClarifyingQuestions: (questions: ClarifyingQuestion[]) => void;
  setWizardLoading: (v: boolean) => void;
  requestDesignPreferences: (direction: PlanDirection) => void;
  requestPlanClarify: (direction: PlanDirection) => void;
  submitPlan: (direction: PlanDirection, designPrefs: Record<string, string>, clarifyAnswers: Record<string, string>) => void;

  // Research wizard
  showResearchWizard: boolean;
  researchClarifyingQuestions: ClarifyingQuestion[];
  researchTopic: string;
  researchDescription: string;
  researchSuggestedName: string;
  researchWizardLoading: boolean;
  setShowResearchWizard: (v: boolean) => void;
  setResearchClarifyingQuestions: (questions: ClarifyingQuestion[], suggestedName: string) => void;
  setResearchTopic: (topic: string) => void;
  setResearchDescription: (description: string) => void;
  setResearchWizardLoading: (v: boolean) => void;
  requestResearchClarify: (topic: string, description: string) => void;
  submitResearch: (query: string, description: string, projectName: string, context: Record<string, string>) => void;

  // Computed helpers
  phaseArtifacts: () => Artifact[];
  phaseGroups: () => Group[];

  // Bridge to extension
  giveFeedback: (artifactId: string, comment: string, bounds?: { x: number; y: number; w: number; h: number }) => void;
  requestBatchRegenerate: () => void;
}

export const useExtensionStore = create<ExtensionStore>((set, get) => ({
  project: null,
  displayPhase: null,
  artifacts: [],
  connections: [],
  groups: [],
  feedback: [],
  agents: [],
  selectedArtifactId: null,
  isResearching: false,
  isPlanning: false,
  reviewMode: false,
  reviewArtifactIndex: 0,
  reviewPhase: null,
  batchRegenerateProgress: null,
  planStages: [],
  imageGenerationProgress: null,
  showPlanWizard: false,
  planDirections: [],
  designDimensions: [],
  planClarifyingQuestions: [],
  wizardLoading: false,
  showResearchWizard: false,
  researchClarifyingQuestions: [],
  researchTopic: "",
  researchDescription: "",
  researchSuggestedName: "",
  researchWizardLoading: false,

  setProject: (project, artifacts, connections, groups, feedback, displayPhase) => {
    set((s) => ({
      project,
      displayPhase: displayPhase ?? null,
      artifacts,
      connections,
      groups,
      feedback,
      // Preserve streaming state when reloading the same project
      agents: s.project?.id === project.id ? s.agents : [],
      isResearching: s.project?.id === project.id ? s.isResearching : false,
      isPlanning: s.project?.id === project.id ? s.isPlanning : false,
      batchRegenerateProgress: s.project?.id === project.id ? s.batchRegenerateProgress : null,
      planStages: s.project?.id === project.id ? s.planStages : [],
      imageGenerationProgress: s.project?.id === project.id ? s.imageGenerationProgress : null,
    }));
  },

  handleWSEvent: (event: WSEvent) => {
    const { type, data } = event;

    switch (type) {
      case "agent_started": {
        const agent = data as unknown as AgentStatus;
        set((s) => {
          const existing = s.agents.findIndex((a) => a.agent_id === agent.agent_id);
          if (existing >= 0) {
            const updated = [...s.agents];
            updated[existing] = { ...updated[existing], ...agent };
            return { agents: updated, isResearching: true };
          }
          return { agents: [...s.agents, agent], isResearching: true };
        });
        break;
      }

      case "agent_thinking": {
        const { agent_id, text } = data as { agent_id: string; text: string };
        set((s) => ({
          agents: s.agents.map((a) =>
            a.agent_id === agent_id ? { ...a, thinking: text } : a
          ),
        }));
        break;
      }

      case "artifact_created":
      case "plan_artifact_created": {
        const artifact = data.artifact as Artifact;
        if (artifact) {
          set((s) => {
            if (s.artifacts.some((a) => a.id === artifact.id)) return s;
            return { artifacts: [...s.artifacts, artifact] };
          });
        }
        break;
      }

      case "connection_created": {
        const connection = data as unknown as ArtifactConnection;
        if (connection?.id) {
          set((s) => ({
            connections: s.connections.some((c) => c.id === connection.id)
              ? s.connections
              : [...s.connections, connection],
          }));
        }
        break;
      }

      case "group_created": {
        const group = data.group as Group;
        if (group) {
          set((s) => ({ groups: [...s.groups, group] }));
        }
        break;
      }

      case "agent_complete": {
        const { agent_id, artifact_count } = data as { agent_id: string; artifact_count?: number };
        set((s) => ({
          agents: s.agents.map((a) =>
            a.agent_id === agent_id
              ? { ...a, status: "complete" as const, ...(artifact_count != null ? { artifact_count } : {}) }
              : a
          ),
        }));
        break;
      }

      case "research_complete":
        set({ isResearching: false });
        break;

      case "plan_complete":
        set({ isPlanning: false, imageGenerationProgress: null });
        break;

      case "images_generating": {
        const total = (data.total as number) || 0;
        set({ imageGenerationProgress: { total, completed: 0 } });
        break;
      }

      case "image_generated": {
        const { artifact_id, image_url } = data as { artifact_id: string; image_url: string };
        set((s) => ({
          artifacts: s.artifacts.map((a) =>
            a.id === artifact_id ? { ...a, image_url } : a
          ),
          imageGenerationProgress: s.imageGenerationProgress
            ? { ...s.imageGenerationProgress, completed: s.imageGenerationProgress.completed + 1 }
            : null,
        }));
        break;
      }

      case "artifact_updated": {
        const artifact = data.artifact as Artifact;
        if (artifact) {
          set((s) => ({
            artifacts: s.artifacts.map((a) =>
              a.id === artifact.id ? artifact : a
            ),
          }));
        }
        break;
      }

      case "feedback_addressed": {
        const { artifact_id } = data as { artifact_id: string };
        set((s) => ({
          feedback: s.feedback.map((f) =>
            f.artifact_id === artifact_id && f.status === "pending"
              ? { ...f, status: "addressed" as const }
              : f
          ),
        }));
        break;
      }

      case "batch_regenerate_start": {
        const total = (data.total as number) || 0;
        set({
          batchRegenerateProgress: {
            total,
            completed: 0,
            currentArtifactId: null,
            failed: 0,
          },
        });
        break;
      }

      case "batch_regenerate_progress": {
        const { artifact_id, status: rStatus } = data as { artifact_id: string; status: string };
        set((s) => ({
          batchRegenerateProgress: s.batchRegenerateProgress
            ? {
                ...s.batchRegenerateProgress,
                completed: s.batchRegenerateProgress.completed + 1,
                currentArtifactId: artifact_id,
                failed: s.batchRegenerateProgress.failed + (rStatus === "failed" ? 1 : 0),
              }
            : null,
        }));
        break;
      }

      case "batch_regenerate_complete":
        // Keep progress visible briefly, then clear
        setTimeout(() => set({ batchRegenerateProgress: null }), 3000);
        break;

      case "design_image_ready": {
        const { option_id, image_url } = data as { option_id: string; image_url: string };
        if (option_id && image_url) {
          get().updateDesignOptionImage(option_id, image_url);
        }
        break;
      }

      case "error": {
        console.error("MVP error:", data.message);
        break;
      }
    }
  },

  setSelectedArtifact: (id) => {
    if (id === null) {
      set({ selectedArtifactId: null });
      return;
    }
    const { artifacts } = get();
    const artifact = artifacts.find((a) => a.id === id);
    if (!artifact) return;
    const phaseArtifacts = artifacts.filter((a) => a.phase === artifact.phase);
    const idx = phaseArtifacts.findIndex((a) => a.id === id);
    if (idx < 0) return;
    set({
      selectedArtifactId: null,
      reviewMode: true,
      reviewArtifactIndex: idx,
      reviewPhase: artifact.phase,
    });
  },

  setReviewMode: (v) => set({ reviewMode: v, ...(v ? {} : { reviewArtifactIndex: 0, reviewPhase: null }) }),

  setReviewArtifactIndex: (i) => {
    const { artifacts, reviewPhase } = get();
    if (!reviewPhase) return;
    const phaseArtifacts = artifacts.filter((a) => a.phase === reviewPhase);
    const clamped = Math.max(0, Math.min(i, phaseArtifacts.length - 1));
    set({ reviewArtifactIndex: clamped });
  },

  updateArtifactPosition: (id, x, y) =>
    set((s) => ({
      artifacts: s.artifacts.map((a) =>
        a.id === id ? { ...a, position_x: x, position_y: y } : a
      ),
    })),

  setFeedback: (feedback) => set({ feedback }),

  addFeedback: (fb) => set((s) => ({ feedback: [...s.feedback, fb] })),

  setShowPlanWizard: (v) => set({ showPlanWizard: v }),

  setPlanDirections: (dirs) => set({ planDirections: dirs }),

  setDesignDimensions: (dims) => set({ designDimensions: dims, wizardLoading: false }),

  updateDesignOptionImage: (optionId, imageUrl) =>
    set((s) => ({
      designDimensions: s.designDimensions.map((dim) => ({
        ...dim,
        option_a: dim.option_a.option_id === optionId ? { ...dim.option_a, image_url: imageUrl } : dim.option_a,
        option_b: dim.option_b.option_id === optionId ? { ...dim.option_b, image_url: imageUrl } : dim.option_b,
      })),
    })),

  setPlanClarifyingQuestions: (questions) => set({ planClarifyingQuestions: questions, wizardLoading: false }),

  setWizardLoading: (v) => set({ wizardLoading: v }),

  requestDesignPreferences: (direction) => {
    sendToExtension({ type: "requestDesignPreferences", direction });
  },

  requestPlanClarify: (direction) => {
    sendToExtension({ type: "requestPlanClarify", direction });
  },

  submitPlan: (direction, designPrefs, clarifyAnswers) => {
    set({ isPlanning: true, showPlanWizard: false });
    sendToExtension({ type: "submitPlan", direction, designPrefs, clarifyAnswers });
  },

  setShowResearchWizard: (v) => set({ showResearchWizard: v }),

  setResearchClarifyingQuestions: (questions, suggestedName) =>
    set({ researchClarifyingQuestions: questions, researchSuggestedName: suggestedName, researchWizardLoading: false }),

  setResearchTopic: (topic) => set({ researchTopic: topic }),

  setResearchDescription: (description) => set({ researchDescription: description }),

  setResearchWizardLoading: (v) => set({ researchWizardLoading: v }),

  requestResearchClarify: (topic, description) => {
    sendToExtension({ type: "requestResearchClarify", topic, description });
  },

  submitResearch: (query, description, projectName, context) => {
    set({ isResearching: true, showResearchWizard: false });
    sendToExtension({ type: "submitResearch", query, description, projectName, context });
  },

  phaseArtifacts: () => {
    const { project, displayPhase, artifacts } = get();
    if (!project) return [];
    const phase = displayPhase ?? project.phase;
    return artifacts.filter((a) => a.phase === phase);
  },

  phaseGroups: () => {
    const { project, displayPhase, groups } = get();
    if (!project) return [];
    const phase = displayPhase ?? project.phase;
    return groups.filter((g) => g.phase === phase);
  },

  giveFeedback: (artifactId, comment, bounds) => {
    sendToExtension({ type: "giveFeedback", artifactId, comment, bounds });
  },

  requestBatchRegenerate: () => {
    sendToExtension({ type: "batchRegenerate" });
  },
}));
