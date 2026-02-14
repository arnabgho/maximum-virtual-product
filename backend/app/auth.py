import logging

from fastapi import Header, HTTPException
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)


async def get_current_user_id(authorization: str | None = Header(None)) -> str | None:
    """Extract user_id from Supabase JWT. Returns None if no token (backward compat)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    try:
        settings = get_settings()
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        user = client.auth.get_user(token)
        return user.user.id
    except Exception:
        logger.warning("Invalid auth token", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid token")
