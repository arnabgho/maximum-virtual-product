from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import Artifact, ArtifactUpdate

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
