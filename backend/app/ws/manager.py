import json
import asyncio
import logging
from fastapi import WebSocket
from collections import defaultdict

logger = logging.getLogger(__name__)


class WSManager:
    """Manages WebSocket connections per project."""

    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections[project_id].append(websocket)
        logger.info("WS client connected: project=%s", project_id)

    async def disconnect(self, project_id: str, websocket: WebSocket):
        async with self._lock:
            if websocket in self._connections[project_id]:
                self._connections[project_id].remove(websocket)
                if not self._connections[project_id]:
                    del self._connections[project_id]
        logger.info("WS client disconnected: project=%s", project_id)

    async def broadcast(self, project_id: str, data: dict):
        """Send a JSON message to all connections for a project."""
        message = json.dumps(data, default=str)
        async with self._lock:
            connections = list(self._connections.get(project_id, []))

        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)

        if disconnected:
            logger.warning("Cleaning up %d stale WS connections for project=%s", len(disconnected), project_id)
            async with self._lock:
                for ws in disconnected:
                    if ws in self._connections[project_id]:
                        self._connections[project_id].remove(ws)

    async def send_event(self, project_id: str, event_type: str, data: dict):
        """Send a typed event to all connections for a project."""
        logger.debug("WS event: type=%s project=%s", event_type, project_id)
        await self.broadcast(project_id, {"type": event_type, "data": data})


# Singleton
_ws_manager: WSManager | None = None


def get_ws_manager() -> WSManager:
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WSManager()
    return _ws_manager
