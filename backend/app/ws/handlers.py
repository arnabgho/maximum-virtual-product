import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
from app.ws.manager import WSManager

logger = logging.getLogger(__name__)


async def handle_project_ws(project_id: str, websocket: WebSocket, ws_manager: WSManager):
    """Handle a WebSocket connection for a project."""
    logger.info("WS connection opened for project=%s", project_id)
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep connection alive, handle any client messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client messages (e.g., ping)
                if msg.get("type") == "ping":
                    logger.debug("Ping received for project=%s", project_id)
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        logger.info("WS connection closed for project=%s", project_id)
        await ws_manager.disconnect(project_id, websocket)
