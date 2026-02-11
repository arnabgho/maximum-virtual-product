import random
import string
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


def generate_artifact_id() -> str:
    chars = string.ascii_lowercase + string.digits
    return "art_" + "".join(random.choices(chars, k=4))


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str = ""
    phase: str = "research"  # "research" or "plan"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectCreate(BaseModel):
    title: str
    description: str = ""


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    phase: str | None = None


class Artifact(BaseModel):
    id: str = Field(default_factory=generate_artifact_id)
    project_id: str
    phase: str  # "research" or "plan"
    type: str  # "markdown", "mermaid", "image", "research_finding", "competitor", "plan_component"
    title: str
    content: str
    summary: str = ""
    source_url: str | None = None
    importance: int = 50
    group_id: str | None = None
    position_x: float = 0.0
    position_y: float = 0.0
    metadata: dict = Field(default_factory=dict)
    references: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ArtifactUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    summary: str | None = None
    importance: int | None = None
    position_x: float | None = None
    position_y: float | None = None
    group_id: str | None = None
    references: list[str] | None = None
    metadata: dict | None = None


class ArtifactConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    from_artifact_id: str
    to_artifact_id: str
    label: str = ""
    connection_type: str = "related"  # "related", "competes", "depends", "references"


class Group(BaseModel):
    id: str = Field(
        default_factory=lambda: "grp_"
        + "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    )
    project_id: str
    phase: str
    title: str
    color: str = "#3b82f6"
    position_x: float = 0.0
    position_y: float = 0.0
    width: float = 800.0
    height: float = 600.0


class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    artifact_id: str
    project_id: str
    source: str = "human"  # "human" or "ai"
    author: str = ""
    comment: str
    status: str = "pending"  # "pending" or "addressed"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FeedbackCreate(BaseModel):
    artifact_id: str
    comment: str
    source: str = "human"
    author: str = ""


class ResearchQuery(BaseModel):
    query: str


class PlanQuery(BaseModel):
    description: str
    reference_artifact_ids: list[str] = Field(default_factory=list)
