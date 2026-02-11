import json
from fastapi import WebSocket, WebSocketDisconnect
from app.ws.manager import WSManager


async def handle_project_ws(project_id: str, websocket: WebSocket, ws_manager: WSManager):
    """Handle a WebSocket connection for a project."""
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep connection alive, handle any client messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client messages (e.g., ping)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(project_id, websocket)
