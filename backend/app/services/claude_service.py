"""Claude Opus 4.6 streaming wrapper for research and planning."""

import json
import anthropic
from app.config import get_settings


def get_client() -> anthropic.Anthropic:
    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


async def plan_research(query: str) -> list[dict]:
    """Use Claude to plan research angles for a query.

    Returns a list of dicts: [{angle: str, sub_query: str, focus: str}, ...]
    """
    client = get_client()

    response = client.messages.create(
        model="claude-opus-4-6-20250219",
        max_tokens=8000,
        temperature=1,  # Required for extended thinking
        thinking={
            "type": "enabled",
            "budget_tokens": 5000,
        },
        messages=[
            {
                "role": "user",
                "content": f"""You are a research planning assistant. Given a research query, generate 3-5 distinct research angles to investigate in parallel.

Research query: "{query}"

Return a JSON array of research angles. Each angle should have:
- "angle": A short label for this research direction (2-5 words)
- "sub_query": A specific search query to use for web search
- "focus": What to look for in the search results (1 sentence)

Return ONLY the JSON array, no other text.

Example output:
[
  {{"angle": "Direct Competitors", "sub_query": "best project management tools 2025", "focus": "Identify the top competitors and their key features"}},
  {{"angle": "User Pain Points", "sub_query": "project management software complaints reviews", "focus": "Common frustrations users have with existing tools"}},
  {{"angle": "Emerging Trends", "sub_query": "project management AI features trends 2025", "focus": "New technologies and approaches being adopted"}}
]""",
            }
        ],
    )

    # Extract text from response (may include thinking blocks)
    text = ""
    for block in response.content:
        if block.type == "text":
            text = block.text
            break

    # Parse JSON
    try:
        # Try to find JSON array in the response
        text = text.strip()
        if not text.startswith("["):
            # Try to extract JSON from markdown code blocks
            import re
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                text = match.group(0)
        angles = json.loads(text)
        return angles
    except (json.JSONDecodeError, AttributeError):
        # Fallback: create a single angle from the original query
        return [
            {
                "angle": "General Research",
                "sub_query": query,
                "focus": "Find comprehensive information about the topic",
            }
        ]


async def summarize_findings(
    query: str, angle: str, search_results: list[dict], page_contents: list[dict]
) -> list[dict]:
    """Use Claude to summarize research findings into structured artifacts.

    Returns list of artifact dicts ready to be created.
    """
    client = get_client()

    # Build context from search results and page contents
    context_parts = []
    for i, (sr, pc) in enumerate(zip(search_results, page_contents)):
        context_parts.append(
            f"### Source {i+1}: {sr.get('title', 'Unknown')}\n"
            f"URL: {sr.get('url', '')}\n"
            f"Snippet: {sr.get('snippet', '')}\n"
            f"Content:\n{pc.get('content', '[Could not fetch]')[:3000]}\n"
        )

    context = "\n---\n".join(context_parts)

    response = client.messages.create(
        model="claude-opus-4-6-20250219",
        max_tokens=8000,
        temperature=1,
        thinking={
            "type": "enabled",
            "budget_tokens": 5000,
        },
        messages=[
            {
                "role": "user",
                "content": f"""You are a research analyst. Analyze the following web research results and create structured findings.

Original query: "{query}"
Research angle: "{angle}"

Sources:
{context}

Create 1-4 research findings from these sources. Each finding should be a JSON object:
{{
  "type": "research_finding" or "competitor",
  "title": "2-6 word title",
  "content": "Detailed markdown content (2-4 paragraphs)",
  "summary": "1-2 sentence summary",
  "source_url": "most relevant source URL",
  "importance": 0-100 score
}}

Return ONLY a JSON array of findings, no other text.""",
            }
        ],
    )

    text = ""
    for block in response.content:
        if block.type == "text":
            text = block.text
            break

    try:
        text = text.strip()
        if not text.startswith("["):
            import re
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                text = match.group(0)
        findings = json.loads(text)
        return findings
    except (json.JSONDecodeError, AttributeError):
        return []


async def synthesize_research(query: str, artifacts: list[dict]) -> dict:
    """Use Claude to synthesize all research artifacts into groups and connections.

    Returns dict with 'groups', 'connections', and 'summary' artifact.
    """
    client = get_client()

    artifact_summaries = "\n".join(
        f"- {a.get('id', 'unknown')}: [{a.get('type', '')}] {a.get('title', '')} — {a.get('summary', '')}"
        for a in artifacts
    )

    response = client.messages.create(
        model="claude-opus-4-6-20250219",
        max_tokens=8000,
        temperature=1,
        thinking={
            "type": "enabled",
            "budget_tokens": 5000,
        },
        messages=[
            {
                "role": "user",
                "content": f"""You are a research synthesizer. Given these research findings, create logical groups and identify connections between them.

Original query: "{query}"

Artifacts:
{artifact_summaries}

Return a JSON object with:
1. "groups": Array of groups, each with:
   - "title": group name
   - "color": hex color (pick distinct colors)
   - "artifact_ids": array of artifact IDs that belong to this group

2. "connections": Array of connections between artifacts, each with:
   - "from_id": artifact ID
   - "to_id": artifact ID
   - "label": relationship description (2-5 words)
   - "connection_type": "related", "competes", "depends", or "references"

3. "summary": A markdown summary (2-3 paragraphs) synthesizing all research findings

Return ONLY the JSON object, no other text.""",
            }
        ],
    )

    text = ""
    for block in response.content:
        if block.type == "text":
            text = block.text
            break

    try:
        text = text.strip()
        if not text.startswith("{"):
            import re
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                text = match.group(0)
        result = json.loads(text)
        return result
    except (json.JSONDecodeError, AttributeError):
        return {"groups": [], "connections": [], "summary": "Research synthesis failed."}


async def generate_plan(
    description: str, research_artifacts: list[dict]
) -> list[dict]:
    """Use Claude to break down a project into plan components.

    Returns list of plan artifact dicts.
    """
    client = get_client()

    research_context = ""
    if research_artifacts:
        research_context = "\n\nAvailable research findings for reference:\n" + "\n".join(
            f"- {a.get('id', '')}: {a.get('title', '')} — {a.get('summary', '')}"
            for a in research_artifacts
        )

    response = client.messages.create(
        model="claude-opus-4-6-20250219",
        max_tokens=12000,
        temperature=1,
        thinking={
            "type": "enabled",
            "budget_tokens": 8000,
        },
        messages=[
            {
                "role": "user",
                "content": f"""You are a product architect. Break down this product/project into a blueprint with components that could be handed to coding agents.

Project description: "{description}"
{research_context}

Create 5-12 plan components. Each should be a JSON object:
{{
  "type": "plan_component",
  "title": "2-6 word component title",
  "content": "Detailed markdown description (3-5 paragraphs) including: purpose, key features, technical approach, dependencies",
  "summary": "1-2 sentence summary",
  "importance": 0-100 (higher = more critical/foundational),
  "references": ["art_xxxx", ...] (IDs of research artifacts this references, if any)
}}

Also include 1-2 "mermaid" type artifacts for architecture diagrams:
{{
  "type": "mermaid",
  "title": "Architecture Overview",
  "content": "graph TD\\n  A[Frontend] --> B[API]\\n  ...",
  "summary": "System architecture diagram",
  "importance": 90,
  "references": []
}}

Return ONLY a JSON array of components, no other text.""",
            }
        ],
    )

    text = ""
    for block in response.content:
        if block.type == "text":
            text = block.text
            break

    try:
        text = text.strip()
        if not text.startswith("["):
            import re
            match = re.search(r"\[[\s\S]*\]", text)
            if match:
                text = match.group(0)
        components = json.loads(text)
        return components
    except (json.JSONDecodeError, AttributeError):
        return []
