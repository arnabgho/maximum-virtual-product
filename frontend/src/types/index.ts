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

export interface Feedback {
  id: string;
  artifact_id: string;
  project_id: string;
  source: "human" | "ai";
  author: string;
  comment: string;
  status: "pending" | "addressed";
  created_at: string;
}

// WebSocket event types
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
  | "plan_directions_ready"
  | "research_directions_planned"
  | "error";

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
}

export interface AgentStatus {
  agent_id: string;
  focus_area: string;
  status: "running" | "complete" | "error";
  artifact_count: number;
  thinking?: string;
  sub_query?: string;
}

export interface ProjectState {
  project: Project | null;
  artifacts: Artifact[];
  connections: ArtifactConnection[];
  groups: Group[];
  feedback: Feedback[];
  agents: AgentStatus[];
  selectedArtifactId: string | null;
  isResearching: boolean;
  isPlanning: boolean;
}
