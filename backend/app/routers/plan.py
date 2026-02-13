import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import DesignPreferencesQuery, PlanClarifyQuery, PlanQuery
from app.services import claude_service
from app.services.image_service import generate_design_pair_images
from app.services.plan_service import run_plan
from app.ws.manager import get_ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["plan"])


async def _safe_run_plan(project_id, description, reference_ids, ws_manager, context=None):
    """Wrapper that catches and reports errors from the background task."""
    try:
        await run_plan(project_id, description, reference_ids, ws_manager, context=context)
    except Exception as e:
        logger.exception("Plan pipeline failed for project %s", project_id)
        try:
            await ws_manager.send_event(project_id, "error", {
                "message": f"Plan generation failed: {str(e)}",
            })
        except Exception:
            pass


@router.post("/{project_id}/design-preferences")
async def design_preferences(project_id: str, data: DesignPreferencesQuery):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch research artifacts for context
    research_artifacts = await db.get_artifacts(project_id, phase="research")
    artifact_dicts = [a.model_dump() for a in research_artifacts]

    project_desc = project.get("description", "") if isinstance(project, dict) else getattr(project, "description", "")

    # Generate dimensions synchronously (returns in ~3-5s)
    dimensions = await claude_service.generate_design_preference_dimensions(
        direction=data.direction,
        research_artifacts=artifact_dicts,
        project_description=project_desc,
    )

    # Kick off background image generation
    ws_manager = get_ws_manager()

    async def _generate_images():
        try:
            async def on_progress(option_id, dimension_id, success, image_url):
                if success and image_url:
                    await ws_manager.send_event(project_id, "design_image_ready", {
                        "option_id": option_id,
                        "dimension_id": dimension_id,
                        "image_url": image_url,
                    })

            await generate_design_pair_images(project_id, dimensions, on_progress=on_progress)
            await ws_manager.send_event(project_id, "design_images_complete", {})
        except Exception as e:
            logger.exception("Design image generation failed for project %s", project_id)

    asyncio.create_task(_generate_images())

    return {"dimensions": dimensions}


@router.post("/{project_id}/plan-clarify")
async def plan_clarify(project_id: str, data: PlanClarifyQuery):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch research artifacts for context
    research_artifacts = await db.get_artifacts(project_id, phase="research")
    artifact_dicts = [a.model_dump() for a in research_artifacts]

    result = await claude_service.generate_plan_clarifying_questions(
        direction=data.direction,
        research_artifacts=artifact_dicts,
        project_description=project.get("description", "") if isinstance(project, dict) else getattr(project, "description", ""),
    )

    return result


@router.post("/{project_id}/plan")
async def start_plan(project_id: str, data: PlanQuery):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.update_project(project_id, {"description": data.description})

    ws_manager = get_ws_manager()

    # Run plan in background task
    asyncio.create_task(
        _safe_run_plan(
            project_id,
            data.description,
            data.reference_artifact_ids,
            ws_manager,
            context=data.context if data.context else None,
        )
    )

    return {"status": "started", "description": data.description}
