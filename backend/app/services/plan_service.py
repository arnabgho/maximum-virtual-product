"""Product/project breakdown service."""

import logging

from app.models.schema import Artifact, ArtifactConnection, Group, generate_artifact_id
from app.services import claude_service, image_service
from app.ws.manager import WSManager
from app.db.supabase import get_db

logger = logging.getLogger(__name__)


GRID_COLS = 4
CARD_WIDTH = 320
CARD_HEIGHT = 240
GAP = 40


async def run_plan(
    project_id: str,
    description: str,
    reference_artifact_ids: list[str],
    ws_manager: WSManager,
):
    """Run the plan breakdown pipeline."""
    db = get_db()
    logger.info("Plan started for project=%s description=%r, %d reference artifacts", project_id, description, len(reference_artifact_ids))

    # Get referenced research artifacts
    research_artifacts = []
    if reference_artifact_ids:
        all_artifacts = await db.get_artifacts(project_id, phase="research")
        research_artifacts = [
            a.model_dump() for a in all_artifacts if a.id in reference_artifact_ids
        ]
    else:
        # Include all research artifacts as context
        all_artifacts = await db.get_artifacts(project_id, phase="research")
        research_artifacts = [a.model_dump() for a in all_artifacts]

    # Generate plan components
    components = await claude_service.generate_plan(description, research_artifacts)
    logger.info("Claude returned %d plan components", len(components))

    # Create artifact objects with layout
    plan_artifacts = []
    for i, comp in enumerate(components):
        col = i % GRID_COLS
        row = i // GRID_COLS
        artifact = Artifact(
            id=generate_artifact_id(),
            project_id=project_id,
            phase="plan",
            type=comp.get("type", "plan_component"),
            title=comp.get("title", "Component"),
            content=comp.get("content", ""),
            summary=comp.get("summary", ""),
            importance=comp.get("importance", 50),
            references=comp.get("references", []),
            position_x=col * (CARD_WIDTH + GAP) + GAP,
            position_y=row * (CARD_HEIGHT + GAP) + GAP,
        )
        plan_artifacts.append(artifact)

        # Stream each artifact
        await ws_manager.send_event(project_id, "plan_artifact_created", {
            "artifact": artifact.model_dump(),
        })

    # Save to database
    try:
        await db.save_artifacts(plan_artifacts)
    except Exception as e:
        logger.error("DB save failed for plan project=%s: %s", project_id, e)
        await ws_manager.send_event(project_id, "error", {
            "message": f"Failed to save plan: {str(e)}",
        })

    # Generate images for plan components
    logger.info("Image generation starting for %d plan artifacts", len(plan_artifacts))
    await ws_manager.send_event(project_id, "images_generating", {
        "total": len(plan_artifacts),
    })

    async def on_image_progress(artifact_id: str, success: bool, image_url: str | None):
        if success and image_url:
            saved = await db.update_artifact_image(artifact_id, image_url)
            if saved:
                await ws_manager.send_event(project_id, "image_generated", {
                    "artifact_id": artifact_id,
                    "image_url": image_url,
                })

    artifact_dicts_for_images = [a.model_dump() for a in plan_artifacts]
    await image_service.generate_images_parallel(
        artifact_dicts_for_images, description, on_progress=on_image_progress
    )

    # Final event
    logger.info("Plan complete: %d components for project=%s", len(plan_artifacts), project_id)
    await ws_manager.send_event(project_id, "plan_complete", {
        "summary": f"Generated {len(plan_artifacts)} plan components for: {description}",
    })
