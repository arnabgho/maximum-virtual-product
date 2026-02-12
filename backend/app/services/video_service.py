"""Remotion video generation service."""

import asyncio
import json
import logging
import os
import tempfile
import uuid

from app.db.supabase import get_db
from app.services.dag_utils import topological_sort_layers

logger = logging.getLogger(__name__)

# Video job tracking (in-memory for now)
_video_jobs: dict[str, dict] = {}

VIDEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "videos")
REMOTION_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "video")


async def generate_video(project_id: str) -> str:
    """Trigger video generation for a project's research artifacts.

    Returns a job_id for tracking status.
    """
    job_id = str(uuid.uuid4())
    _video_jobs[job_id] = {
        "project_id": project_id,
        "status": "rendering",
        "url": None,
    }

    # Run rendering in background
    asyncio.create_task(_render_video(job_id, project_id))
    return job_id


async def _render_video(job_id: str, project_id: str) -> None:
    """Fetch data, compute topological order, render via Remotion."""
    try:
        db = get_db()

        # Fetch project and artifacts
        project = await db.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        artifacts = await db.get_artifacts(project_id, phase="research")
        connections = await db.get_connections(project_id)
        groups = await db.get_groups(project_id, phase="research")

        if not artifacts:
            raise ValueError("No research artifacts to render")

        # Build group title lookup
        group_map = {g.id: g.title for g in groups}

        # Compute topological order
        artifact_ids = [a.id for a in artifacts]
        conn_dicts = [
            {"from_id": c.from_artifact_id, "to_id": c.to_artifact_id}
            for c in connections
        ]
        layers = topological_sort_layers(artifact_ids, conn_dicts)

        # Build parent map for breadcrumbs
        parent_map: dict[str, list[str]] = {}
        artifact_title_map = {a.id: a.title for a in artifacts}
        for c in connections:
            parent_map.setdefault(c.to_artifact_id, []).append(
                artifact_title_map.get(c.from_artifact_id, "")
            )

        # Flatten layers into ordered artifact list
        ordered_ids = [aid for layer in layers for aid in layer]
        artifact_by_id = {a.id: a for a in artifacts}

        ordered_artifacts = []
        for aid in ordered_ids:
            a = artifact_by_id.get(aid)
            if not a:
                continue
            ordered_artifacts.append({
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "summary": a.summary,
                "type": a.type,
                "source_url": a.source_url,
                "importance": a.importance,
                "group_title": group_map.get(a.group_id or "", None),
                "image_url": a.image_url,
                "breadcrumbs": parent_map.get(a.id, []),
            })

        # Find summary artifact for narrative
        narrative = ""
        for a in artifacts:
            if a.type == "markdown" and a.title == "Research Summary":
                narrative = a.content
                break

        props = {
            "artifacts": ordered_artifacts,
            "projectTitle": project.title,
            "narrative": narrative or f"Research findings for: {project.title}",
            "connections": conn_dicts,
        }

        # Write props to temp file
        os.makedirs(VIDEO_DIR, exist_ok=True)
        props_file = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        )
        json.dump(props, props_file)
        props_file.close()

        output_filename = f"{project_id}_{job_id[:8]}.mp4"
        output_path = os.path.join(VIDEO_DIR, output_filename)

        # Pre-flight: ensure Remotion CLI is installed
        remotion_bin = os.path.join(REMOTION_DIR, "node_modules", ".bin", "remotion")
        if not os.path.isfile(remotion_bin):
            logger.error(
                "Remotion CLI not found at %s. Run 'npm install' in the video/ directory.",
                remotion_bin,
            )
            _video_jobs[job_id]["status"] = "error"
            os.unlink(props_file.name)
            return

        # Shell out to Remotion
        cmd = [
            "npx", "remotion", "render",
            "ResearchVideo", output_path,
            "--props", props_file.name,
        ]

        logger.info("Rendering video: %s", " ".join(cmd))
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=REMOTION_DIR,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        # Clean up props file
        os.unlink(props_file.name)

        if proc.returncode != 0:
            logger.error("Remotion render failed: %s", stderr.decode())
            _video_jobs[job_id]["status"] = "error"
            return

        # Upload to Supabase Storage (sync call, run in thread)
        video_url = await asyncio.to_thread(db.upload_video, output_path, output_filename)

        # Clean up local file
        try:
            os.unlink(output_path)
        except OSError:
            logger.warning("Could not delete local video file: %s", output_path)

        _video_jobs[job_id]["status"] = "complete"
        _video_jobs[job_id]["url"] = video_url
        logger.info("Video uploaded to Supabase Storage: %s", video_url)

    except Exception as e:
        logger.error("Video generation failed for project=%s: %s", project_id, e)
        _video_jobs[job_id]["status"] = "error"


async def get_video_status(project_id: str) -> dict:
    """Get the latest video generation status for a project."""
    for job_id, job in reversed(list(_video_jobs.items())):
        if job["project_id"] == project_id:
            return {"status": job["status"], "url": job.get("url"), "job_id": job_id}
    return {"status": "none", "url": None, "job_id": None}
