from fastapi import APIRouter, HTTPException

from app.db.supabase import get_db
from app.models.schema import Project, ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project)
async def create_project(data: ProjectCreate):
    db = get_db()
    project = Project(title=data.title, description=data.description)
    return await db.create_project(project)


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    db = get_db()
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, data: ProjectUpdate):
    db = get_db()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    project = await db.update_project(project_id, updates)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
