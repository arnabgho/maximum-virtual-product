"""Brave Search API client for web research."""

import httpx
from pydantic import BaseModel
from app.config import get_settings


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


async def search(query: str, count: int = 5) -> list[SearchResult]:
    """Search the web using Brave Search API.

    Args:
        query: Search query string
        count: Number of results to return (max 20)

    Returns:
        List of search results with title, url, and snippet
    """
    settings = get_settings()
    if not settings.BRAVE_API_KEY:
        raise ValueError("BRAVE_API_KEY not configured")

    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": settings.BRAVE_API_KEY,
    }

    params = {
        "q": query,
        "count": min(count, 20),
        "text_decorations": False,
        "search_lang": "en",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers=headers,
            params=params,
        )
        response.raise_for_status()
        data = response.json()

    results = []
    for item in data.get("web", {}).get("results", []):
        results.append(
            SearchResult(
                title=item.get("title", ""),
                url=item.get("url", ""),
                snippet=item.get("description", ""),
            )
        )

    return results[:count]
