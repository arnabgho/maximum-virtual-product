import asyncio

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import ResearchQuery
from app.services.research_service import run_research
from app.ws.manager import get_ws_manager

router = APIRouter(prefix="/api/projects", tags=["research"])


@router.post("/{project_id}/research")
async def start_research(project_id: str, data: ResearchQuery):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ws_manager = get_ws_manager()

    # Run research in background task so request returns immediately
    asyncio.create_task(run_research(project_id, data.query, ws_manager))

    return {"status": "started", "query": data.query}
