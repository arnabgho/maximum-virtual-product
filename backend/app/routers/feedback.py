import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.db.supabase import get_db
from app.models.schema import Feedback, FeedbackCreate
from app.services import claude_service, image_service
from app.ws.manager import get_ws_manager

logger = logging.getLogger(__name__)

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


@router.post("/{project_id}/artifacts/{artifact_id}/regenerate")
async def regenerate_artifact(
    project_id: str,
    artifact_id: str,
    background_tasks: BackgroundTasks,
):
    db = get_db()

    # Get artifact
    artifacts = await db.get_artifacts(project_id)
    artifact = next((a for a in artifacts if a.id == artifact_id), None)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Get pending feedback
    all_feedback = await db.get_feedback(project_id, artifact_id)
    pending = [f for f in all_feedback if f.status == "pending"]
    if not pending:
        raise HTTPException(status_code=400, detail="No pending feedback to address")

    background_tasks.add_task(
        _regenerate_artifact_task, project_id, artifact_id, artifact, pending
    )
    return {"status": "regenerating", "artifact_id": artifact_id}


async def _regenerate_artifact_task(
    project_id: str,
    artifact_id: str,
    artifact,
    pending_feedback: list[Feedback],
):
    db = get_db()
    ws_manager = get_ws_manager()

    feedback_comments = [f.comment for f in pending_feedback]
    artifact_dict = artifact.model_dump()

    # Call Claude to regenerate
    logger.info("Regeneration requested for artifact=%s", artifact_id)
    result = await claude_service.regenerate_artifact(artifact_dict, feedback_comments)
    if not result:
        logger.error("Regeneration Claude call failed for artifact=%s", artifact_id)
        await ws_manager.send_event(project_id, "error", {
            "message": f"Failed to regenerate artifact {artifact_id}",
        })
        return

    # Update artifact in DB
    updates = {
        "title": result.get("title", artifact.title),
        "content": result.get("content", artifact.content),
        "summary": result.get("summary", artifact.summary),
    }
    updated = await db.update_artifact(artifact_id, updates)
    if not updated:
        logger.error("Regeneration DB save failed for artifact=%s", artifact_id)
        await ws_manager.send_event(project_id, "error", {
            "message": f"Failed to save regenerated artifact {artifact_id}",
        })
        return

    # Mark feedback as addressed
    await db.mark_feedback_addressed(artifact_id)

    # Broadcast updated artifact
    await ws_manager.send_event(project_id, "artifact_updated", {
        "artifact": updated.model_dump(),
    })
    await ws_manager.send_event(project_id, "feedback_addressed", {
        "artifact_id": artifact_id,
    })
    logger.info("Regeneration complete for artifact=%s", artifact_id)

    # Generate new image
    updated_dict = updated.model_dump()
    image_url = await image_service.generate_artifact_image(
        updated_dict, updated.title
    )
    if image_url:
        saved = await db.update_artifact_image(artifact_id, image_url)
        if saved:
            await ws_manager.send_event(project_id, "image_generated", {
                "artifact_id": artifact_id,
                "image_url": image_url,
            })
