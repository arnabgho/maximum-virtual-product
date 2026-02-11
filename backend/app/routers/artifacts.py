from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import Artifact, ArtifactConnection, ArtifactUpdate, Group

router = APIRouter(prefix="/api", tags=["artifacts"])


@router.get("/projects/{project_id}/artifacts", response_model=list[Artifact])
async def list_artifacts(project_id: str, phase: str | None = None):
    db = get_db()
    return await db.get_artifacts(project_id, phase)


@router.patch("/artifacts/{artifact_id}", response_model=Artifact)
async def update_artifact(artifact_id: str, data: ArtifactUpdate):
    db = get_db()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    artifact = await db.update_artifact(artifact_id, updates)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return artifact


@router.get("/projects/{project_id}/connections", response_model=list[ArtifactConnection])
async def list_connections(project_id: str):
    db = get_db()
    return await db.get_connections(project_id)


@router.get("/projects/{project_id}/groups", response_model=list[Group])
async def list_groups(project_id: str, phase: str | None = None):
    db = get_db()
    return await db.get_groups(project_id, phase)
