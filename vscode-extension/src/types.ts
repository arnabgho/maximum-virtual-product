// Types shared between extension host and webview — mirrors frontend/src/types/index.ts

export type Phase = "research" | "plan";

export type ArtifactType =
  | "markdown"
  | "mermaid"
  | "image"
  | "research_finding"
  | "competitor"
  | "plan_component"
  | "ui_screen"
  | "video";

export type ConnectionType = "related" | "competes" | "depends" | "references";

export interface Project {
  id: string;
  title: string;
  description: string;
  phase: Phase;
  plan_directions: PlanDirection[];
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  project_id: string;
  phase: Phase;
  type: ArtifactType;
  title: string;
  content: string;
  summary: string;
  source_url: string | null;
  importance: number;
  group_id: string | null;
  position_x: number;
  position_y: number;
  metadata: Record<string, unknown>;
  image_url?: string | null;
  references: string[];
  created_at: string;
}

export interface ArtifactConnection {
  id: string;
  project_id: string;
  from_artifact_id: string;
  to_artifact_id: string;
  label: string;
  connection_type: ConnectionType;
}

export interface Group {
  id: string;
  project_id: string;
  phase: Phase;
  title: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}

export interface ClarifyingQuestion {
  question: string;
  options: string[];
}

export interface PlanDirection {
  title: string;
  description: string;
  key_focus: string;
}

export interface SpatialBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Feedback {
  id: string;
  artifact_id: string;
  project_id: string;
  source: "human" | "ai";
  author: string;
  comment: string;
  bounds: SpatialBounds | null;
  status: "pending" | "addressed";
  created_at: string;
}

export interface AgentStatus {
  agent_id: string;
  focus_area: string;
  status: "running" | "complete" | "error";
  artifact_count: number;
  thinking?: string;
  sub_query?: string;
}

export type WSEventType =
  | "agent_started"
  | "agent_thinking"
  | "artifact_created"
  | "connection_created"
  | "group_created"
  | "agent_complete"
  | "research_complete"
  | "plan_artifact_created"
  | "plan_complete"
  | "images_generating"
  | "image_generated"
  | "artifact_updated"
  | "feedback_addressed"
  | "batch_regenerate_start"
  | "batch_regenerate_progress"
  | "batch_regenerate_complete"
  | "plan_directions_ready"
  | "research_directions_planned"
  | "design_image_ready"
  | "design_images_complete"
  | "images_complete"
  | "error";

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
}

export interface PlanStage {
  id: string;
  label: string;
  status: "running" | "complete";
  detail?: string;
}

// Message protocol between extension host and webview
export type ExtToWebview =
  | { type: "loadProject"; project: Project; artifacts: Artifact[]; connections: ArtifactConnection[]; groups: Group[]; feedback: Feedback[] }
  | { type: "wsEvent"; event: WSEvent }
  | { type: "artifactsUpdated"; artifacts: Artifact[] }
  | { type: "feedbackUpdated"; feedback: Feedback[] }
  | { type: "themeChanged"; kind: "light" | "dark" };

export type WebviewToExt =
  | { type: "ready" }
  | { type: "giveFeedback"; artifactId: string; comment: string; bounds?: SpatialBounds }
  | { type: "regenerate"; artifactId: string }
  | { type: "batchRegenerate" }
  | { type: "exportPlan" }
  | { type: "openInBrowser" };
