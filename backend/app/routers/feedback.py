from fastapi import APIRouter

from app.db.supabase import get_db
from app.models.schema import Feedback, FeedbackCreate

router = APIRouter(prefix="/api/projects", tags=["feedback"])


@router.post("/{project_id}/feedback", response_model=Feedback)
async def add_feedback(project_id: str, data: FeedbackCreate):
    db = get_db()
    feedback = Feedback(
        artifact_id=data.artifact_id,
        project_id=project_id,
        source=data.source,
        author=data.author,
        comment=data.comment,
    )
    return await db.create_feedback(feedback)


@router.get("/{project_id}/feedback", response_model=list[Feedback])
async def list_feedback(project_id: str, artifact_id: str | None = None):
    db = get_db()
    return await db.get_feedback(project_id, artifact_id)
