"""Web page fetcher with content extraction using readability."""

import httpx
from pydantic import BaseModel
from lxml.html.clean import Cleaner
from readability import Document


class FetchResult(BaseModel):
    url: str
    content: str
    title: str
    status: int
    truncated: bool


async def fetch_and_parse(url: str, max_chars: int = 10000) -> FetchResult:
    """Fetch a web page and extract its main content.

    Args:
        url: URL to fetch
        max_chars: Maximum characters to return (truncates if longer)

    Returns:
        FetchResult with extracted content as clean text
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MVPResearchBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        max_redirects=5,
    ) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    # Use readability to extract main content
    doc = Document(html)
    title = doc.title() or ""
    summary_html = doc.summary()

    # Clean HTML to plain text
    cleaner = Cleaner(
        scripts=True,
        javascript=True,
        comments=True,
        style=True,
        links=False,
        meta=True,
        page_structure=False,
        processing_instructions=True,
        embedded=True,
        frames=True,
        forms=True,
        annoying_tags=True,
        remove_tags=None,
        allow_tags=None,
        remove_unknown_tags=True,
        safe_attrs_only=True,
    )

    try:
        from lxml import html as lxml_html
        cleaned = cleaner.clean_html(summary_html)
        doc_tree = lxml_html.fromstring(cleaned)
        text = doc_tree.text_content()
    except Exception:
        # Fallback: strip HTML tags manually
        import re
        text = re.sub(r"<[^>]+>", "", summary_html)

    # Clean up whitespace
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)

    truncated = len(text) > max_chars
    if truncated:
        text = text[:max_chars] + "\n\n[Content truncated]"

    return FetchResult(
        url=str(response.url),
        content=text,
        title=title,
        status=response.status_code,
        truncated=truncated,
    )
