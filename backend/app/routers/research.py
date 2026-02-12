import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import ResearchQuery
from app.services.research_service import run_research
from app.ws.manager import get_ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["research"])


async def _safe_run_research(project_id: str, query: str, ws_manager):
    """Wrapper that catches and reports errors from the background task."""
    try:
        await run_research(project_id, query, ws_manager)
    except Exception as e:
        logger.exception("Research pipeline failed for project %s", project_id)
        try:
            await ws_manager.send_event(project_id, "error", {
                "message": f"Research failed: {str(e)}",
            })
        except Exception:
            pass


@router.post("/{project_id}/research")
async def start_research(project_id: str, data: ResearchQuery):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ws_manager = get_ws_manager()

    # Run research in background task so request returns immediately
    asyncio.create_task(_safe_run_research(project_id, data.query, ws_manager))

    return {"status": "started", "query": data.query}
