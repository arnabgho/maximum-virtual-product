"""Claude Opus 4.6 streaming wrapper for research and planning."""

import json
import logging
import re

import anthropic
from app.config import get_settings

logger = logging.getLogger(__name__)


def get_client() -> anthropic.Anthropic:
    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


async def generate_clarifying_questions(query: str, description: str = "") -> list[dict]:
    """Generate 2-3 clarifying questions with options for a research query.

    Returns: [{question: str, options: [str, str, str, str]}, ...]
    """
    client = get_client()

    description_block = ""
    if description:
        description_block = f'\nDescription of what the user wants to build: "{description}"\n'

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a research planning assistant. Given a topic and what the user wants to build, generate 2-3 clarifying questions that will help focus the research.

Topic: "{query}"
{description_block}
Each question should help narrow the research scope. Provide 3-4 answer options per question.

Return ONLY a JSON array, no other text:
[
  {{"question": "What is your primary goal?", "options": ["Market analysis", "Build a product", "Academic research", "Personal learning"]}},
  {{"question": "What's your target audience?", "options": ["Consumers", "Businesses", "Developers", "Enterprise"]}}
]""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        questions = _parse_json_array(text)
        return questions
    except (json.JSONDecodeError, AttributeError):
        return [
            {
                "question": "What is your primary goal with this research?",
                "options": ["Market analysis", "Build a product", "Academic research", "General exploration"],
            }
        ]


async def suggest_plan_directions(query: str, context: dict, artifacts: list[dict]) -> list[dict]:
    """Suggest 2-3 plan directions based on research findings.

    Returns: [{title: str, description: str, key_focus: str}, ...]
    """
    client = get_client()

    context_str = ""
    if context:
        context_str = "\n\nUser context:\n" + "\n".join(
            f"- {k}: {v}" for k, v in context.items()
        )

    artifact_summaries = "\n".join(
        f"- [{a.get('type', '')}] {a.get('title', '')}: {a.get('summary', '')}"
        for a in artifacts[:20]
    )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a product strategist. Based on the research findings below, suggest 2-3 distinct plan directions the user could pursue.

Original topic: "{query}"
{context_str}

Research findings:
{artifact_summaries}

Each direction should be a different strategic approach. Return ONLY a JSON array:
[
  {{
    "title": "Short direction title (3-6 words)",
    "description": "2-3 sentence description of this direction and what it would involve",
    "key_focus": "The primary focus area in 5-10 words"
  }}
]""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        directions = _parse_json_array(text)
        return directions
    except (json.JSONDecodeError, AttributeError):
        return [
            {
                "title": "Comprehensive Product Blueprint",
                "description": f"Build a full product plan based on the research findings for: {query}",
                "key_focus": "End-to-end product development plan",
            }
        ]


async def plan_research(query: str, context: dict | None = None) -> list[dict]:
    """Use Claude to plan research angles for a query.

    Returns a list of dicts: [{angle: str, sub_query: str, focus: str}, ...]
    """
    client = get_client()

    context_str = ""
    if context:
        context_str = "\n\nAdditional context from the user:\n" + "\n".join(
            f"- {k}: {v}" for k, v in context.items()
        )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a research planning assistant. Given a research query, generate exactly 4 distinct research angles to investigate in parallel.

Research query: "{query}"
{context_str}

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

    text = _extract_text(response)

    try:
        angles = _parse_json_array(text)
        return angles
    except (json.JSONDecodeError, AttributeError):
        return [
            {
                "angle": "General Research",
                "sub_query": query,
                "focus": "Find comprehensive information about the topic",
            }
        ]


def _extract_text(response) -> str:
    """Extract all text blocks from a Claude response (ignoring tool use blocks)."""
    parts = []
    for block in response.content:
        if block.type == "text":
            parts.append(block.text)
    return "\n".join(parts)


def _parse_json_array(text: str) -> list[dict]:
    """Extract and parse a JSON array from text that may contain other content."""
    text = text.strip()
    if not text.startswith("["):
        match = re.search(r"\[[\s\S]*\]", text)
        if match:
            text = match.group(0)
    return json.loads(text)


def _parse_json_object(text: str) -> dict:
    """Extract and parse a JSON object from text that may contain other content."""
    text = text.strip()
    if not text.startswith("{"):
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group(0)
    return json.loads(text)


async def research_angle_with_search(sub_query: str, angle: str, focus: str) -> list[dict]:
    """Use Claude with built-in web search to research an angle.

    Claude searches the web, reads results, and synthesizes findings in a
    single API call — no Brave API or custom fetching needed.

    Returns list of finding dicts ready to be created as artifacts.
    """
    client = get_client()

    tools = [
        {
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 4,
        }
    ]

    messages = [
        {
            "role": "user",
            "content": f"""You are a research analyst. Search the web to investigate the following research angle.

Search query: "{sub_query}"
Research angle: "{angle}"
Focus: {focus}

Instructions:
1. Search the web for relevant, recent information
2. Analyze the search results thoroughly
3. Create 1-4 structured research findings based on what you discover

Each finding must be a JSON object:
{{
  "type": "research_finding" or "competitor",
  "title": "2-6 word title",
  "content": "Detailed markdown content (2-4 paragraphs with specific facts, data, and insights)",
  "summary": "1-2 sentence summary",
  "source_url": "most relevant source URL from search results",
  "importance": 0-100 score
}}

After searching and analyzing, return ONLY a JSON array of findings as your final output, no other text.""",
        }
    ]

    # Handle pause_turn for long-running searches
    max_continuations = 3
    for _ in range(max_continuations + 1):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=8000,
            tools=tools,
            messages=messages,
        )

        if response.stop_reason == "pause_turn":
            # Continue the turn — pass response back as assistant message
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": "Continue."})
            continue
        break

    # Extract the final text (Claude's analysis after searching)
    text = _extract_text(response)
    logger.info("Research angle '%s' completed, extracting findings", angle)

    try:
        findings = _parse_json_array(text)
        return findings
    except (json.JSONDecodeError, AttributeError, TypeError):
        logger.warning("Failed to parse findings for angle '%s': %s", angle, text[:200])
        return []


async def summarize_findings(
    query: str, angle: str, search_results: list[dict], page_contents: list[dict]
) -> list[dict]:
    """Legacy: Use Claude to summarize research findings into structured artifacts.

    Kept for backward compatibility. New code uses research_angle_with_search().
    """
    client = get_client()

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
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
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

    text = _extract_text(response)

    try:
        findings = _parse_json_array(text)
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
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
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

2. "connections": Array of DIRECTED connections forming a DAG (no cycles).
   Each connection flows from a foundational artifact to one that builds upon it.
   - "from_id": the prerequisite/foundational artifact ID
   - "to_id": the artifact that builds upon or extends from_id
   - "label": relationship description (2-5 words)
   - "connection_type": "depends", "references", "related", or "competes"

   Rules:
   - from_id is the FOUNDATION, to_id BUILDS ON it
   - NO cycles (if A→B exists, no path from B back to A)
   - Aim for layers: some root artifacts (no incoming), some leaves (no outgoing)
   - Every artifact should have at least one connection

3. "summary": A markdown summary (2-3 paragraphs) synthesizing all research findings

Return ONLY the JSON object, no other text.""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        result = _parse_json_object(text)
        return result
    except (json.JSONDecodeError, AttributeError):
        return {"groups": [], "connections": [], "summary": "Research synthesis failed."}


async def generate_plan(
    description: str, research_artifacts: list[dict]
) -> dict:
    """Use Claude to break down a project into plan components with connections.

    Returns dict with "components" and "connections" keys.
    """
    client = get_client()

    research_context = ""
    if research_artifacts:
        research_context = "\n\nAvailable research findings for reference:\n" + "\n".join(
            f"- {a.get('id', '')}: {a.get('title', '')} — {a.get('summary', '')}"
            for a in research_artifacts
        )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=12000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a product architect. Break down this product/project into a blueprint with components that could be handed to coding agents.

Project description: "{description}"
{research_context}

Create 4-6 plan components. Each should be a JSON object with a temp_id for cross-referencing:
{{
  "temp_id": "comp_1",
  "type": "plan_component",
  "title": "2-6 word component title",
  "content": "Detailed markdown description (3-5 paragraphs) including: purpose, key features, technical approach, dependencies",
  "summary": "1-2 sentence summary",
  "importance": 0-100 (higher = more critical/foundational),
  "references": ["art_xxxx", ...] (IDs of research artifacts this references, if any)
}}

Also include 1-2 "mermaid" type artifacts for architecture diagrams:
{{
  "temp_id": "comp_N",
  "type": "mermaid",
  "title": "Architecture Overview",
  "content": "graph TD\\n  A[Frontend] --> B[API]\\n  ...",
  "summary": "System architecture diagram",
  "importance": 90,
  "references": []
}}

Also define DIRECTED connections between components forming a DAG (no cycles).
Each connection flows from a foundational component to one that depends on it.
{{
  "from_id": "comp_1",
  "to_id": "comp_3",
  "label": "relationship description (2-5 words)",
  "connection_type": "depends" or "references"
}}

Rules for connections:
- from_id is the FOUNDATION, to_id DEPENDS ON or BUILDS UPON it
- NO cycles (if A→B exists, no path from B back to A)
- Aim for layers: some root components (no incoming), some leaves (no outgoing)
- Every component should have at least one connection

Return ONLY a JSON object with this structure, no other text:
{{
  "components": [ ... ],
  "connections": [ ... ]
}}""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        result = _parse_json_object(text)
        if "components" in result:
            return result
        # Shouldn't happen, but be defensive
        return {"components": [], "connections": []}
    except (json.JSONDecodeError, AttributeError):
        pass

    # Fallback: try parsing as array (old format)
    try:
        components = _parse_json_array(text)
        return {"components": components, "connections": []}
    except (json.JSONDecodeError, AttributeError):
        return {"components": [], "connections": []}


async def regenerate_artifact(artifact: dict, feedback_comments: list[str]) -> dict | None:
    """Use Claude to regenerate an artifact based on feedback.

    Returns updated artifact fields (title, content, summary) or None on failure.
    """
    client = get_client()

    feedback_text = "\n".join(f"- {c}" for c in feedback_comments)

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a research/product analyst. An artifact needs to be improved based on feedback.

Original artifact:
- Type: {artifact.get('type', 'unknown')}
- Title: {artifact.get('title', '')}
- Content:
{artifact.get('content', '')}

Feedback to address:
{feedback_text}

Rewrite the artifact incorporating ALL the feedback. Return a JSON object with:
{{
  "title": "Updated title (keep similar style, 2-6 words)",
  "content": "Updated detailed markdown content",
  "summary": "Updated 1-2 sentence summary"
}}

Return ONLY the JSON object, no other text.""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        return _parse_json_object(text)
    except (json.JSONDecodeError, AttributeError):
        return None
