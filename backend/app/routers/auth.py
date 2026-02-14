import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GitHubExchangeRequest(BaseModel):
    github_token: str


class GitHubExchangeResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str


@router.post("/github-exchange", response_model=GitHubExchangeResponse)
async def github_exchange(data: GitHubExchangeRequest):
    """Exchange a GitHub access token (from VS Code) for a Supabase JWT."""
    settings = get_settings()

    # 1. Verify GitHub token and get user info
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {data.github_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid GitHub token")
        github_user = user_res.json()

        # Get primary email (may be private)
        email = github_user.get("email")
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {data.github_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            if emails_res.status_code == 200:
                emails = emails_res.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = (
                    primary["email"]
                    if primary
                    else emails[0]["email"] if emails else None
                )
        if not email:
            raise HTTPException(
                status_code=400, detail="Could not get email from GitHub"
            )

    logger.info("GitHub exchange for user=%s email=%s", github_user.get("login"), email)

    # 2. Supabase admin client (service role)
    admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    # 3. Ensure user exists in Supabase Auth
    try:
        admin.auth.admin.create_user(
            {
                "email": email,
                "email_confirm": True,
                "user_metadata": {
                    "avatar_url": github_user.get("avatar_url", ""),
                    "user_name": github_user.get("login", ""),
                    "full_name": github_user.get("name", ""),
                    "provider": "github",
                },
            }
        )
        logger.info("Created Supabase user for %s", email)
    except Exception:
        logger.debug("Supabase user already exists for %s (expected)", email)

    # 4. Generate magic link → get hashed token
    try:
        link_res = admin.auth.admin.generate_link(
            {
                "type": "magiclink",
                "email": email,
            }
        )
        hashed_token = link_res.properties.hashed_token
    except Exception as e:
        logger.error("generate_link failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to generate auth link"
        )

    # 5. Verify token hash → get Supabase session
    async with httpx.AsyncClient() as client:
        verify_res = await client.post(
            f"{settings.SUPABASE_URL}/auth/v1/verify",
            json={
                "type": "magiclink",
                "token_hash": hashed_token,
            },
            headers={
                "apikey": settings.SUPABASE_KEY,
                "Content-Type": "application/json",
            },
        )
        if verify_res.status_code != 200:
            logger.error(
                "Supabase verify failed: %s %s",
                verify_res.status_code,
                verify_res.text,
            )
            raise HTTPException(
                status_code=500, detail="Failed to verify auth token"
            )
        session_data = verify_res.json()

    return GitHubExchangeResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        user_id=session_data["user"]["id"],
    )
