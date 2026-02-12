"""Gemini image generation service for artifact visuals."""

import asyncio
import base64
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_BACKOFF = 2.0
TIMEOUT_SECONDS = 45

PROMPT_TEMPLATES = {
    "research_finding": (
        "Create a detailed illustration depicting the concept: {title}. "
        "Key details to visually represent: {summary}. "
        "Style: rich conceptual scene with visual metaphors, saturated colors, "
        "and flowing compositions on a dark background (#1e1e2e). "
        "IMPORTANT: Do NOT render any text, letters, numbers, words, or written labels in the image."
    ),
    "competitor": (
        "Create a detailed product illustration representing: {title}. "
        "Visual context: {summary}. "
        "Style: polished product concept art with clean gradients and a "
        "professional aesthetic on a dark background (#1e1e2e). "
        "IMPORTANT: Do NOT render any text, letters, numbers, words, or written labels in the image."
    ),
    "plan_component": (
        "Create a detailed technical illustration showing: {title}. "
        "What this component does: {summary}. "
        "Style: node-and-connection aesthetics with glowing edges and "
        "circuit-like compositions on a dark background (#1e1e2e). "
        "IMPORTANT: Do NOT render any text, letters, numbers, words, or written labels in the image."
    ),
    "markdown": (
        "Create a detailed conceptual illustration for: {title}. "
        "Context: {summary}. "
        "Style: rich visual storytelling with harmonious colors and "
        "organic-meets-geometric compositions on a dark background (#1e1e2e). "
        "IMPORTANT: Do NOT render any text, letters, numbers, words, or written labels in the image."
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

    Returns a base64 data URL or None on failure.
    """
    prompt = _get_prompt(artifact)
    client = _get_client()

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

            # Extract image from response
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        img_bytes = part.inline_data.data
                        mime = part.inline_data.mime_type
                        b64 = base64.b64encode(img_bytes).decode("utf-8")
                        return f"data:{mime};base64,{b64}"

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

    Returns a dict mapping artifact_id -> image data URL for successful generations.
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
