import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import artifacts, auth, feedback, plan, projects, research, video, export, plan_directions
from app.ws.handlers import handle_project_ws
from app.ws.manager import get_ws_manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    logger.info("MVP backend starting up")
    from app.db.supabase import get_db
    db = get_db()
    db.ensure_video_bucket()
    yield
    logger.info("MVP backend shutting down")


app = FastAPI(title="Maximum Virtual Product", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(artifacts.router)
app.include_router(feedback.router)
app.include_router(research.router)
app.include_router(plan.router)
app.include_router(video.router)
app.include_router(export.router)
app.include_router(plan_directions.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    ws_manager = get_ws_manager()
    await handle_project_ws(project_id, websocket, ws_manager)
