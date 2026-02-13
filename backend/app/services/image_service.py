"""Gemini image generation service for artifact visuals."""

import asyncio
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from google import genai
from google.genai import types

from app.config import get_settings
from app.db.supabase import get_db

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_BACKOFF = 2.0
TIMEOUT_SECONDS = 45

PROMPT_TEMPLATES = {
    "research_finding": (
        "Create an infographic visualizing: {title}. "
        "Key findings: {summary}. "
        "Style: clean data visualization on dark background (#1e1e2e). "
        "Use bold colors, clear icons, and minimal text. No watermarks."
    ),
    "competitor": (
        "Create a brand/product visual for: {title}. "
        "{summary}. "
        "Style: product showcase on dark background (#1e1e2e). "
        "Clean, professional design. No watermarks."
    ),
    "plan_component": (
        "Create a blueprint/wireframe diagram for: {title}. "
        "Component: {summary}. "
        "Style: technical blueprint on dark background (#1e1e2e). "
        "Use clean lines, geometric shapes. No watermarks."
    ),
    "markdown": (
        "Create a visual summary infographic for: {title}. "
        "{summary}. "
        "Style: clean, modern infographic on dark background (#1e1e2e). "
        "No watermarks."
    ),
}


def _get_prompt(artifact: dict) -> str:
    artifact_type = artifact.get("type", "markdown")
    template = PROMPT_TEMPLATES.get(artifact_type, PROMPT_TEMPLATES["markdown"])
    return template.format(
        title=artifact.get("title", ""),
        summary=artifact.get("summary", artifact.get("content", "")[:200]),
    )


def _get_client() -> genai.Client:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_artifact_image(artifact: dict, context: str) -> str | None:
    """Generate an image for a single artifact using Gemini.

    Returns a public Supabase Storage URL or None on failure.
    """
    prompt = _get_prompt(artifact)
    client = _get_client()
    artifact_id = artifact.get("id", "unknown")
    project_id = artifact.get("project_id", "unknown")

    for attempt in range(MAX_RETRIES):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-3-pro-image-preview",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"],
                    ),
                ),
                timeout=TIMEOUT_SECONDS,
            )

            # Extract image from response and upload to Supabase Storage
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        img_bytes = part.inline_data.data
                        mime = part.inline_data.mime_type
                        ext = "jpg" if "jpeg" in mime else mime.split("/")[-1]
                        destination = f"{project_id}/{artifact_id}.{ext}"
                        db = get_db()
                        public_url = db.upload_image(img_bytes, destination, content_type=mime)
                        return public_url

            logger.warning(
                "No image in Gemini response for artifact %s (attempt %d)",
                artifact.get("id", "?"),
                attempt + 1,
            )

        except asyncio.TimeoutError:
            logger.warning(
                "Timeout generating image for artifact %s (attempt %d)",
                artifact.get("id", "?"),
                attempt + 1,
            )
        except Exception as e:
            logger.warning(
                "Error generating image for artifact %s (attempt %d): %s",
                artifact.get("id", "?"),
                attempt + 1,
                str(e),
            )

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(INITIAL_BACKOFF * (2 ** attempt))

    return None


ProgressCallback = Callable[[str, bool, str | None], Coroutine[Any, Any, None]]


async def generate_images_parallel(
    artifacts: list[dict],
    context: str,
    on_progress: ProgressCallback | None = None,
) -> dict[str, str]:
    """Generate images for all artifacts concurrently.

    Returns a dict mapping artifact_id -> public image URL for successful generations.
    """
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not set, skipping image generation")
        return {}

    async def _generate_one(artifact: dict) -> tuple[str, str | None]:
        artifact_id = artifact.get("id", "")
        image_url = await generate_artifact_image(artifact, context)
        if on_progress:
            await on_progress(artifact_id, image_url is not None, image_url)
        return artifact_id, image_url

    tasks = [_generate_one(a) for a in artifacts]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    image_map: dict[str, str] = {}
    for result in results:
        if isinstance(result, Exception):
            logger.error("Image generation task failed: %s", result)
            continue
        artifact_id, image_url = result
        if image_url:
            image_map[artifact_id] = image_url

    return image_map
