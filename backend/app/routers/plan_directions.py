"""Router for plan directions (re-derive from existing research artifacts)."""

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.services.claude_service import suggest_plan_directions

router = APIRouter(prefix="/api/projects", tags=["plan-directions"])


@router.get("/{project_id}/plan-directions")
async def get_plan_directions(project_id: str):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    artifacts = await db.get_artifacts(project_id, phase="research")
    if not artifacts:
        raise HTTPException(
            status_code=400, detail="No research artifacts to derive directions from"
        )

    artifact_dicts = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "summary": a.summary,
            "type": a.type,
            "source_url": a.source_url,
        }
        for a in artifacts
    ]

    directions = await suggest_plan_directions(
        project.title, {}, artifact_dicts
    )

    return {"directions": directions}
