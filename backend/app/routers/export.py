"""Router for project export (implementation-ready markdown)."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse

from app.services.export_service import export_project_markdown

router = APIRouter(prefix="/api/projects", tags=["export"])


@router.get("/{project_id}/export")
async def export_project(
    project_id: str,
    format: str = Query(default="json", pattern="^(json|text)$"),
):
    try:
        markdown = await export_project_markdown(project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if format == "text":
        return PlainTextResponse(markdown)

    return {"markdown": markdown, "project_id": project_id}
