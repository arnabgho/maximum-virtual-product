from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.services.video_service import generate_video, get_video_status

router = APIRouter(prefix="/api/projects", tags=["video"])


@router.post("/{project_id}/video")
async def trigger_video(project_id: str):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = await generate_video(project_id)
    return {"status": "started", "job_id": job_id}


@router.get("/{project_id}/video/status")
async def video_status(project_id: str):
    result = await get_video_status(project_id)
    return result
