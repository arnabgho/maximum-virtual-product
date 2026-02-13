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


async def generate_clarifying_questions(query: str, description: str = "") -> dict:
    """Generate 2-3 clarifying questions with options and a suggested project name.

    Returns: {questions: [{question, options}], suggested_name: str}
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

Also generate a short project name (3-6 words) that captures the essence of what the user wants to build or research.

Return ONLY a JSON object, no other text:
{{
  "questions": [
    {{"question": "What is your primary goal?", "options": ["Market analysis", "Build a product", "Academic research", "Personal learning"]}},
    {{"question": "What's your target audience?", "options": ["Consumers", "Businesses", "Developers", "Enterprise"]}}
  ],
  "suggested_name": "AI Research Assistant Platform"
}}""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        result = _parse_json_object(text)
        if "questions" in result and "suggested_name" in result:
            return result
        # Handle case where only questions array is returned
        if "questions" in result:
            result["suggested_name"] = query[:50]
            return result
        raise ValueError("Missing questions key")
    except (json.JSONDecodeError, AttributeError, ValueError):
        return {
            "questions": [
                {
                    "question": "What is your primary goal with this research?",
                    "options": ["Market analysis", "Build a product", "Academic research", "General exploration"],
                }
            ],
            "suggested_name": query[:50],
        }


async def generate_plan_clarifying_questions(
    direction: dict, research_artifacts: list[dict], project_description: str = ""
) -> dict:
    """Generate 2-3 clarifying questions for plan generation based on selected direction.

    Returns: {questions: [{question, options}]}
    """
    client = get_client()

    direction_block = ""
    if direction:
        direction_block = (
            f'\nSelected direction: "{direction.get("title", "")}"\n'
            f'Description: {direction.get("description", "")}\n'
            f'Key focus: {direction.get("key_focus", "")}\n'
        )

    description_block = ""
    if project_description:
        description_block = f'\nProject description: "{project_description}"\n'

    artifact_summaries = "\n".join(
        f"- [{a.get('type', '')}] {a.get('title', '')}: {a.get('summary', '')}"
        for a in research_artifacts[:15]
    )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a product planning assistant. Based on the selected direction and research findings, generate 2-3 clarifying questions that will help create a better product blueprint.
{direction_block}{description_block}
Research findings:
{artifact_summaries}

Ask questions about:
- Preferred tech stack or implementation approach
- MVP scope vs full product scope
- Target users and their primary needs
- Key priorities (speed to market, scalability, UX quality, etc.)

Each question should have 3-4 answer options. Return ONLY a JSON object:
{{
  "questions": [
    {{"question": "What tech stack do you prefer?", "options": ["React + Node.js", "Next.js full-stack", "Python + React", "No preference"]}},
    {{"question": "What scope should this plan cover?", "options": ["MVP / proof of concept", "Full product v1", "Enterprise-grade system"]}}
  ]
}}""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        result = _parse_json_object(text)
        if "questions" in result:
            return result
        raise ValueError("Missing questions key")
    except (json.JSONDecodeError, AttributeError, ValueError):
        return {
            "questions": [
                {
                    "question": "What scope should this plan cover?",
                    "options": [
                        "MVP / proof of concept",
                        "Full product v1",
                        "Enterprise-grade system",
                    ],
                }
            ]
        }


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


async def generate_design_preference_dimensions(
    direction: dict, research_artifacts: list[dict], project_description: str = ""
) -> list[dict]:
    """Generate 5 design dimension pairs for user preference selection.

    Each dimension has two options with image prompts for Gemini.
    Returns: [{dimension_id, dimension_name, description, option_a: {option_id, label, description, image_prompt}, option_b: {...}}, ...]
    """
    client = get_client()

    direction_block = ""
    if direction:
        direction_block = (
            f'\nSelected direction: "{direction.get("title", "")}"\n'
            f'Description: {direction.get("description", "")}\n'
        )

    description_block = ""
    if project_description:
        description_block = f'\nProject description: "{project_description}"\n'

    artifact_summaries = "\n".join(
        f"- [{a.get('type', '')}] {a.get('title', '')}: {a.get('summary', '')}"
        for a in research_artifacts[:10]
    )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=6000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a product design consultant. Based on the product direction and research, generate exactly 5 design preference dimensions.

Each dimension presents TWO contrasting visual/UX approaches for THIS specific product. Make them specific to the product, not generic.
{direction_block}{description_block}
Research findings:
{artifact_summaries}

For each dimension, create two options with detailed image prompts that Gemini can use to generate UI mockup screenshots.

Return ONLY a JSON array of 5 objects:
[
  {{
    "dimension_id": "dim_1",
    "dimension_name": "Color Scheme",
    "description": "Overall color palette and mood",
    "option_a": {{
      "option_id": "dim_1_a",
      "label": "Dark & Moody",
      "description": "Deep navy/charcoal palette with neon accents",
      "image_prompt": "High-fidelity UI mockup screenshot of a [product type] app with dark navy background, neon cyan accents, modern sans-serif typography, showing the main dashboard view. Clean, professional design. No watermarks."
    }},
    "option_b": {{
      "option_id": "dim_1_b",
      "label": "Light & Clean",
      "description": "White/cream palette with subtle color accents",
      "image_prompt": "High-fidelity UI mockup screenshot of a [product type] app with white/cream background, soft blue accents, clean typography, showing the main dashboard view. Minimal, airy design. No watermarks."
    }}
  }}
]

Make all 5 dimensions different aspects: color scheme, layout style, typography/density, visual elements, component style. Tailor image prompts to this specific product.""",
            }
        ],
    )

    text = _extract_text(response)

    try:
        dimensions = _parse_json_array(text)
        # Validate structure
        for dim in dimensions:
            if not all(k in dim for k in ("dimension_id", "dimension_name", "option_a", "option_b")):
                raise ValueError("Invalid dimension structure")
        return dimensions[:5]
    except (json.JSONDecodeError, AttributeError, ValueError):
        logger.warning("Failed to parse design dimensions, using fallback")
        return _fallback_design_dimensions()


def _fallback_design_dimensions() -> list[dict]:
    """Generic fallback dimensions if Claude fails."""
    return [
        {
            "dimension_id": "dim_1",
            "dimension_name": "Color Scheme",
            "description": "Overall color palette and mood",
            "option_a": {"option_id": "dim_1_a", "label": "Dark & Moody", "description": "Deep dark palette with vibrant accents", "image_prompt": ""},
            "option_b": {"option_id": "dim_1_b", "label": "Light & Clean", "description": "Bright, airy palette with subtle tones", "image_prompt": ""},
        },
        {
            "dimension_id": "dim_2",
            "dimension_name": "Layout Style",
            "description": "How content is organized on screen",
            "option_a": {"option_id": "dim_2_a", "label": "Dense & Data-rich", "description": "Compact layout with lots of info visible", "image_prompt": ""},
            "option_b": {"option_id": "dim_2_b", "label": "Spacious & Focused", "description": "Generous whitespace, one thing at a time", "image_prompt": ""},
        },
        {
            "dimension_id": "dim_3",
            "dimension_name": "Typography",
            "description": "Text styling and readability approach",
            "option_a": {"option_id": "dim_3_a", "label": "Modern Sans-serif", "description": "Clean geometric sans-serif fonts", "image_prompt": ""},
            "option_b": {"option_id": "dim_3_b", "label": "Warm & Humanist", "description": "Rounded, friendly typefaces", "image_prompt": ""},
        },
        {
            "dimension_id": "dim_4",
            "dimension_name": "Visual Elements",
            "description": "Use of imagery and decorative elements",
            "option_a": {"option_id": "dim_4_a", "label": "Illustration-heavy", "description": "Custom illustrations and icons throughout", "image_prompt": ""},
            "option_b": {"option_id": "dim_4_b", "label": "Photo-driven", "description": "Real photography and minimal illustrations", "image_prompt": ""},
        },
        {
            "dimension_id": "dim_5",
            "dimension_name": "Component Style",
            "description": "Shape language for buttons, cards, inputs",
            "option_a": {"option_id": "dim_5_a", "label": "Sharp & Angular", "description": "Square corners, strong borders, bold contrast", "image_prompt": ""},
            "option_b": {"option_id": "dim_5_b", "label": "Soft & Rounded", "description": "Rounded corners, subtle shadows, gentle edges", "image_prompt": ""},
        },
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
    description: str, research_artifacts: list[dict], context: dict | None = None
) -> dict:
    """Use Claude to break down a project into plan components with connections.

    Returns dict with "components", "connections", and "design_system" keys.
    """
    client = get_client()

    research_context = ""
    if research_artifacts:
        research_context = "\n\nAvailable research findings for reference:\n" + "\n".join(
            f"- {a.get('id', '')}: {a.get('title', '')} — {a.get('summary', '')}"
            for a in research_artifacts
        )

    user_prefs = ""
    if context:
        user_prefs = "\n\nUser preferences and requirements:\n" + "\n".join(
            f"- {k}: {v}" for k, v in context.items()
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
{research_context}{user_prefs}

Create 4-6 plan components. Each should be a JSON object with a temp_id for cross-referencing:
{{
  "temp_id": "comp_1",
  "type": "plan_component",
  "title": "2-6 word component title",
  "content": "Detailed markdown description (3-5 paragraphs) including: purpose, key features, technical approach, dependencies",
  "summary": "1-2 sentence summary",
  "importance": 0-100 (higher = more critical/foundational),
  "references": ["art_xxxx", ...] (IDs of research artifacts this references, if any),
  "has_ui": true/false (whether this component has a user-facing interface),
  "ui_description": "Brief description of the UI screen if has_ui is true"
}}

For components with has_ui: true, provide a ui_description that describes what the user would see on screen (layout, key elements, interactions).

Also include 1-2 "mermaid" type artifacts for architecture diagrams:
{{
  "temp_id": "comp_N",
  "type": "mermaid",
  "title": "Architecture Overview",
  "content": "graph TD\\n  A[Frontend] --> B[API]\\n  ...",
  "summary": "System architecture diagram",
  "importance": 90,
  "references": [],
  "has_ui": false
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

Also define a design_system for the product's visual identity:
{{
  "primary_color": "#hex",
  "secondary_color": "#hex",
  "accent_color": "#hex",
  "background_style": "dark/light/gradient description",
  "font_style": "modern sans-serif/monospace/etc",
  "overall_feel": "minimal and clean/bold and vibrant/etc"
}}

Return ONLY a JSON object with this structure, no other text:
{{
  "components": [ ... ],
  "connections": [ ... ],
  "design_system": {{ ... }}
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


async def regenerate_artifact(artifact: dict, feedback_items: list[dict]) -> dict | None:
    """Use Claude to regenerate an artifact based on feedback.

    Args:
        artifact: The artifact dict to regenerate.
        feedback_items: List of dicts with 'comment' (str) and optional 'bounds' (dict with x,y,w,h as 0-1 fractions).

    Returns updated artifact fields (title, content, summary) or None on failure.
    """
    client = get_client()

    feedback_lines = []
    for i, item in enumerate(feedback_items, 1):
        line = f"- Feedback #{i}: {item['comment']}"
        if item.get('bounds'):
            b = item['bounds']
            cx, cy = b['x'] + b['w'] / 2, b['y'] + b['h'] / 2
            h_pos = "left" if cx < 0.33 else "center" if cx < 0.67 else "right"
            v_pos = "top" if cy < 0.33 else "middle" if cy < 0.67 else "bottom"
            line += f" [Refers to the {v_pos}-{h_pos} area of the visual]"
        feedback_lines.append(line)
    feedback_text = "\n".join(feedback_lines)

    artifact_type = artifact.get('type', 'unknown')
    type_instruction = ""
    if artifact_type == "mermaid":
        type_instruction = (
            "\n\nIMPORTANT: This is a mermaid diagram artifact. The 'content' field contains mermaid syntax. "
            "You MUST update the mermaid syntax in 'content' to reflect the feedback — this is the ONLY way to change the visual diagram."
        )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        messages=[
            {
                "role": "user",
                "content": f"""You are a research/product analyst. An artifact needs to be improved based on feedback.

Original artifact:
- Type: {artifact_type}
- Title: {artifact.get('title', '')}
- Content:
{artifact.get('content', '')}

Feedback to address:
{feedback_text}

Rewrite the artifact incorporating ALL the feedback. Update the written content so it matches the visual changes implied by the feedback.{type_instruction}

Return a JSON object with:
{{
  "title": "Updated title (keep similar style, 2-6 words)",
  "content": "Updated detailed markdown/mermaid content reflecting all feedback",
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
