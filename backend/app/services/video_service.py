"""Remotion video generation service (Phase 2)."""

from app.db.supabase import get_db


# Video job tracking (in-memory for now)
_video_jobs: dict[str, dict] = {}


async def generate_video(project_id: str) -> str:
    """Trigger video generation for a project's research artifacts.

    Returns a job_id for tracking status.
    """
    import uuid
    job_id = str(uuid.uuid4())
    _video_jobs[job_id] = {
        "project_id": project_id,
        "status": "pending",
        "url": None,
    }
    # TODO: Implement Remotion rendering in Phase 2
    # For now, mark as pending
    _video_jobs[job_id]["status"] = "pending"
    return job_id


async def get_video_status(project_id: str) -> dict:
    """Get the latest video generation status for a project."""
    for job_id, job in reversed(list(_video_jobs.items())):
        if job["project_id"] == project_id:
            return {"status": job["status"], "url": job.get("url"), "job_id": job_id}
    return {"status": "none", "url": None, "job_id": None}
