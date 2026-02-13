"""Orchestrates parallel research sub-agents."""

import asyncio
import logging

from app.models.schema import (
    Artifact,
    ArtifactConnection,
    Group,
    generate_artifact_id,
)
from app.services import claude_service, image_service
from app.services.dag_utils import remove_cycles
from app.agents.research_agent import ResearchAgent
from app.ws.manager import WSManager
from app.db.supabase import get_db

logger = logging.getLogger(__name__)

GRID_COLS = 4
CARD_WIDTH = 320
CARD_HEIGHT = 240
GAP = 40


def compute_layout(artifacts: list[Artifact], groups: list[dict]) -> tuple[list[Artifact], list[Group]]:
    """Compute grid positions for artifacts, grouped."""
    group_objects = []
    assigned_artifacts = set()

    y_offset = 0
    for g_data in groups:
        g_artifact_ids = g_data.get("artifact_ids", [])
        group_artifacts = [a for a in artifacts if a.id in g_artifact_ids]

        if not group_artifacts:
            continue

        # Position artifacts within group
        for i, art in enumerate(group_artifacts):
            col = i % GRID_COLS
            row = i // GRID_COLS
            art.position_x = col * (CARD_WIDTH + GAP) + GAP
            art.position_y = y_offset + row * (CARD_HEIGHT + GAP) + 60  # 60 for group header
            assigned_artifacts.add(art.id)

        rows_in_group = (len(group_artifacts) + GRID_COLS - 1) // GRID_COLS
        group_width = GRID_COLS * (CARD_WIDTH + GAP) + GAP
        group_height = rows_in_group * (CARD_HEIGHT + GAP) + 60 + GAP

        group = Group(
            project_id=artifacts[0].project_id if artifacts else "",
            phase="research",
            title=g_data.get("title", "Group"),
            color=g_data.get("color", "#3b82f6"),
            position_x=0,
            position_y=y_offset,
            width=group_width,
            height=group_height,
        )
        group_objects.append(group)

        # Assign group_id to artifacts
        for art in group_artifacts:
            art.group_id = group.id

        y_offset += group_height + GAP

    # Position ungrouped artifacts
    ungrouped = [a for a in artifacts if a.id not in assigned_artifacts]
    for i, art in enumerate(ungrouped):
        col = i % GRID_COLS
        row = i // GRID_COLS
        art.position_x = col * (CARD_WIDTH + GAP) + GAP
        art.position_y = y_offset + row * (CARD_HEIGHT + GAP) + GAP

    return artifacts, group_objects


async def run_research(project_id: str, query: str, ws_manager: WSManager, *, context: dict | None = None):
    """Run the full research pipeline: plan -> parallel agents -> synthesize -> suggest directions."""
    db = get_db()

    logger.info("Research started for project=%s query=%r context=%r", project_id, query, context)

    # Step 1: Claude plans research angles (enriched with user context)
    angles = await claude_service.plan_research(query, context=context)
    logger.info("Planned %d research angles", len(angles))

    # Broadcast planned directions to the frontend
    await ws_manager.send_event(project_id, "research_directions_planned", {
        "angles": [
            {"angle": a.get("angle", "Research"), "sub_query": a.get("sub_query", "")}
            for a in angles
        ],
    })

    # Step 2: Run sub-agents in parallel
    logger.info("Spawning %d research agents", len(angles))
    tasks = []
    for angle in angles:
        agent = ResearchAgent(angle, project_id, ws_manager)
        tasks.append(agent.execute())

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Collect all artifacts from successful agents
    all_artifacts: list[Artifact] = []
    failed_count = 0
    for result in results:
        if isinstance(result, Exception):
            failed_count += 1
            continue
        all_artifacts.extend(result)

    succeeded = len(results) - failed_count
    logger.info("Agent results: %d succeeded, %d failed, %d total artifacts", succeeded, failed_count, len(all_artifacts))

    if not all_artifacts:
        logger.warning("All agents failed — 0 artifacts produced for query=%r", query)
        await ws_manager.send_event(project_id, "research_complete", {
            "summary": "No findings were generated.",
            "total_artifacts": 0,
        })
        return

    # Step 3: Claude synthesizes findings into groups + connections
    artifact_dicts = [a.model_dump() for a in all_artifacts]
    synthesis = await claude_service.synthesize_research(query, artifact_dicts)
    logger.info("Synthesis complete: %d groups, %d connections", len(synthesis.get("groups", [])), len(synthesis.get("connections", [])))

    # Compute layout
    all_artifacts, group_objects = compute_layout(all_artifacts, synthesis.get("groups", []))

    # Create connections (enforce DAG — remove any cycles)
    artifact_ids = {a.id for a in all_artifacts}
    raw_connections = synthesis.get("connections", [])
    dag_connections = remove_cycles(raw_connections, artifact_ids)

    connections = []
    for conn_data in dag_connections:
        from_id = conn_data.get("from_id", "")
        to_id = conn_data.get("to_id", "")
        if from_id in artifact_ids and to_id in artifact_ids:
            conn = ArtifactConnection(
                project_id=project_id,
                from_artifact_id=from_id,
                to_artifact_id=to_id,
                label=conn_data.get("label", ""),
                connection_type=conn_data.get("connection_type", "related"),
            )
            connections.append(conn)

    # Create summary artifact
    summary_artifact = Artifact(
        id=generate_artifact_id(),
        project_id=project_id,
        phase="research",
        type="markdown",
        title="Research Summary",
        content=synthesis.get("summary", ""),
        summary=f"Summary of research on: {query}",
        importance=95,
        position_x=0,
        position_y=-200,  # Above everything
    )
    all_artifacts.insert(0, summary_artifact)

    # Step 4: Save everything to Supabase
    try:
        await db.save_artifacts(all_artifacts)
        await db.save_connections(connections)
        await db.save_groups(group_objects)
    except Exception as e:
        logger.error("DB save failed for research project=%s: %s", project_id, e)
        await ws_manager.send_event(project_id, "error", {
            "message": f"Failed to save research: {str(e)}",
        })

    # Broadcast groups and connections
    for group in group_objects:
        await ws_manager.send_event(project_id, "group_created", {
            "group": group.model_dump(),
        })

    for conn in connections:
        await ws_manager.send_event(project_id, "connection_created", {
            "id": conn.id,
            "project_id": conn.project_id,
            "from_artifact_id": conn.from_artifact_id,
            "to_artifact_id": conn.to_artifact_id,
            "label": conn.label,
            "connection_type": conn.connection_type,
        })

    # Broadcast summary artifact
    await ws_manager.send_event(project_id, "artifact_created", {
        "artifact": summary_artifact.model_dump(),
    })

    # Send research_complete immediately (before images)
    logger.info("Research complete: %d total artifacts for project=%s", len(all_artifacts), project_id)
    await ws_manager.send_event(project_id, "research_complete", {
        "summary": synthesis.get("summary", ""),
        "total_artifacts": len(all_artifacts),
    })

    # Step 4b: Generate plan directions from research findings
    try:
        directions = await claude_service.suggest_plan_directions(
            query, context or {}, artifact_dicts
        )
        logger.info("Generated %d plan directions for project=%s", len(directions), project_id)
        await db.update_project(project_id, {"plan_directions": directions})
        await ws_manager.send_event(project_id, "plan_directions_ready", {
            "directions": directions,
        })
    except Exception as e:
        logger.error("Plan direction generation failed: %s", e)

    # Step 5: Generate images as a fire-and-forget background task
    logger.info("Image generation starting for %d artifacts", len(all_artifacts))
    await ws_manager.send_event(project_id, "images_generating", {
        "total": len(all_artifacts),
    })

    async def on_image_progress(artifact_id: str, success: bool, image_url: str | None):
        if success and image_url:
            saved = await db.update_artifact_image(artifact_id, image_url)
            if saved:
                await ws_manager.send_event(project_id, "image_generated", {
                    "artifact_id": artifact_id,
                    "image_url": image_url,
                })

    artifact_dicts_for_images = [a.model_dump() for a in all_artifacts]

    async def _generate_images():
        try:
            await image_service.generate_images_parallel(
                artifact_dicts_for_images, query, on_progress=on_image_progress
            )
        except Exception as e:
            logger.error("Image generation failed: %s", e)
        finally:
            await ws_manager.send_event(project_id, "images_complete", {})

    asyncio.create_task(_generate_images())
