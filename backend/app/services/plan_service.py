"""Product/project breakdown service."""

import logging

from app.models.schema import Artifact, ArtifactConnection, Group, generate_artifact_id
from app.services import claude_service, image_service
from app.services.dag_utils import remove_cycles
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

    # Generate plan components + connections
    plan_result = await claude_service.generate_plan(description, research_artifacts)
    components = plan_result.get("components", [])
    raw_connections = plan_result.get("connections", [])
    logger.info("Claude returned %d plan components, %d connections", len(components), len(raw_connections))

    # Create artifact objects — positions set to 0; frontend dagre layout computes real positions
    plan_artifacts = []
    temp_to_real: dict[str, str] = {}
    for comp in components:
        real_id = generate_artifact_id()
        temp_id = comp.get("temp_id", "")
        if temp_id:
            temp_to_real[temp_id] = real_id

        artifact = Artifact(
            id=real_id,
            project_id=project_id,
            phase="plan",
            type=comp.get("type", "plan_component"),
            title=comp.get("title", "Component"),
            content=comp.get("content", ""),
            summary=comp.get("summary", ""),
            importance=comp.get("importance", 50),
            references=comp.get("references", []),
            position_x=0,
            position_y=0,
        )
        plan_artifacts.append(artifact)

        # Stream each artifact
        await ws_manager.send_event(project_id, "plan_artifact_created", {
            "artifact": artifact.model_dump(),
        })

    # Remap temp_ids to real artifact IDs in connections
    remapped_connections = []
    for conn_data in raw_connections:
        from_id = temp_to_real.get(conn_data.get("from_id", ""), "")
        to_id = temp_to_real.get(conn_data.get("to_id", ""), "")
        if from_id and to_id:
            remapped_connections.append({
                "from_id": from_id,
                "to_id": to_id,
                "label": conn_data.get("label", ""),
                "connection_type": conn_data.get("connection_type", "depends"),
            })

    # Enforce DAG — remove any cycles
    artifact_ids = {a.id for a in plan_artifacts}
    dag_connections_data = remove_cycles(remapped_connections, artifact_ids)

    connections = []
    for conn_data in dag_connections_data:
        conn = ArtifactConnection(
            project_id=project_id,
            from_artifact_id=conn_data["from_id"],
            to_artifact_id=conn_data["to_id"],
            label=conn_data.get("label", ""),
            connection_type=conn_data.get("connection_type", "depends"),
        )
        connections.append(conn)

    # Save to database
    try:
        await db.save_artifacts(plan_artifacts)
        if connections:
            await db.save_connections(connections)
    except Exception as e:
        logger.error("DB save failed for plan project=%s: %s", project_id, e)
        await ws_manager.send_event(project_id, "error", {
            "message": f"Failed to save plan: {str(e)}",
        })

    # Broadcast connections
    for conn in connections:
        await ws_manager.send_event(project_id, "connection_created", {
            "from_artifact_id": conn.from_artifact_id,
            "to_artifact_id": conn.to_artifact_id,
            "label": conn.label,
            "connection_type": conn.connection_type,
        })

    # Generate images for plan components (skip mermaid artifacts)
    imageable = [a for a in plan_artifacts if a.type != "mermaid"]
    logger.info("Image generation starting for %d plan artifacts (skipping %d mermaid)", len(imageable), len(plan_artifacts) - len(imageable))
    await ws_manager.send_event(project_id, "images_generating", {
        "total": len(imageable),
    })

    async def on_image_progress(artifact_id: str, success: bool, image_url: str | None):
        if success and image_url:
            saved = await db.update_artifact_image(artifact_id, image_url)
            if saved:
                await ws_manager.send_event(project_id, "image_generated", {
                    "artifact_id": artifact_id,
                    "image_url": image_url,
                })

    artifact_dicts_for_images = [a.model_dump() for a in imageable]
    await image_service.generate_images_parallel(
        artifact_dicts_for_images, description, on_progress=on_image_progress
    )

    # Final event
    logger.info("Plan complete: %d components for project=%s", len(plan_artifacts), project_id)
    await ws_manager.send_event(project_id, "plan_complete", {
        "summary": f"Generated {len(plan_artifacts)} plan components for: {description}",
    })
