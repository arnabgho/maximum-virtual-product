"""MCP server exposing MVP tools for Claude Code integration."""

import asyncio
import json
import logging
import os
import webbrowser
from pathlib import Path

import httpx
import websockets
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mvp-mcp")

BACKEND_URL = os.environ.get("MVP_BACKEND_URL", "http://localhost:8000")
WS_URL = BACKEND_URL.replace("http://", "ws://").replace("https://", "wss://")
FRONTEND_URL = os.environ.get("MVP_FRONTEND_URL", "http://localhost:5173")

mcp = FastMCP("mvp", instructions="MVP: AI-powered research and product blueprint system")


def _api_url(path: str) -> str:
    return f"{BACKEND_URL}{path}"


def _format_project(p: dict) -> str:
    phase = p.get("phase", "research")
    return f"- **{p['title']}** (`{p['id']}`) — phase: {phase}"


def _format_artifact(a: dict) -> str:
    lines = [f"### {a['title']} (`{a['id']}`)"]
    lines.append(f"**Type:** {a.get('type', 'unknown')} | **Importance:** {a.get('importance', 50)}/100")
    if a.get("summary"):
        lines.append(a["summary"])
    if a.get("source_url"):
        lines.append(f"Source: {a['source_url']}")
    return "\n".join(lines)


async def _wait_for_ws_event(
    project_id: str,
    completion_event: str,
    timeout: float = 300,
) -> list[dict]:
    """Connect to project WebSocket and collect events until completion."""
    ws_url = f"{WS_URL}/ws/projects/{project_id}"
    collected: list[dict] = []

    async with websockets.connect(ws_url) as ws:
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            except asyncio.TimeoutError:
                collected.append({"type": "timeout", "data": {"message": "Operation timed out after 5 minutes"}})
                break

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = msg.get("type", "")
            collected.append(msg)
            logger.info("WS event: %s", event_type)

            if event_type == completion_event:
                break
            if event_type == "error":
                break

    return collected


# ---------- Tools ----------


@mcp.tool()
async def list_projects() -> str:
    """List all MVP projects."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(_api_url("/api/projects"))
        resp.raise_for_status()
    projects = resp.json()
    if not projects:
        return "No projects found."
    lines = ["# Projects\n"]
    for p in projects:
        lines.append(_format_project(p))
    return "\n".join(lines)


@mcp.tool()
async def create_project(title: str, description: str = "") -> str:
    """Create a new MVP project.

    Args:
        title: Project name / research topic
        description: What you want to build (optional)
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _api_url("/api/projects"),
            json={"title": title, "description": description},
        )
        resp.raise_for_status()
    proj = resp.json()
    return f"Project created: **{proj['title']}** (`{proj['id']}`)"


@mcp.tool()
async def get_clarifying_questions(topic: str, description: str = "") -> str:
    """Get AI-generated clarifying questions for a research topic.

    Args:
        topic: The research topic or project name
        description: Description of what to build (optional)
    """
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _api_url("/api/clarify"),
            json={"query": topic, "description": description},
        )
        resp.raise_for_status()
    data = resp.json()
    questions = data.get("questions", [])
    if not questions:
        return "No clarifying questions generated."
    lines = ["# Clarifying Questions\n"]
    for i, q in enumerate(questions, 1):
        lines.append(f"**{i}. {q.get('question', '')}**")
        for opt in q.get("options", []):
            lines.append(f"  - {opt}")
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
async def start_research(project_id: str, query: str, context: dict | None = None) -> str:
    """Start AI research on a project. Waits for completion (up to 5 min).

    Args:
        project_id: UUID of the project
        query: Research query / topic
        context: Optional dict of clarifying question answers
    """
    # Connect WebSocket first, then fire the POST
    ws_url = f"{WS_URL}/ws/projects/{project_id}"
    collected: list[dict] = []

    async with websockets.connect(ws_url) as ws:
        # Fire the research request
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                _api_url(f"/api/projects/{project_id}/research"),
                json={"query": query, "context": context or {}},
            )
            resp.raise_for_status()

        # Collect events until research_complete or error
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=300)
            except asyncio.TimeoutError:
                collected.append({"type": "timeout", "data": {"message": "Research timed out"}})
                break
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = msg.get("type", "")
            collected.append(msg)

            if event_type == "research_complete":
                break
            if event_type == "error":
                break

    # Format summary
    artifacts = [
        m["data"].get("artifact", m.get("data", {}))
        for m in collected
        if m.get("type") in ("artifact_created",)
    ]
    errors = [m for m in collected if m.get("type") == "error"]

    if errors:
        return f"Research failed: {errors[0].get('data', {}).get('message', 'Unknown error')}"

    complete_msg = next((m for m in collected if m["type"] == "research_complete"), None)
    summary_text = complete_msg["data"].get("summary", "") if complete_msg else ""

    lines = [f"# Research Complete\n"]
    if summary_text:
        lines.append(f"{summary_text}\n")
    lines.append(f"**Total artifacts:** {len(artifacts)}\n")
    for a in artifacts[:10]:
        lines.append(_format_artifact(a))
        lines.append("")

    if len(artifacts) > 10:
        lines.append(f"_...and {len(artifacts) - 10} more artifacts_")

    return "\n".join(lines)


@mcp.tool()
async def get_artifacts(project_id: str, phase: str | None = None) -> str:
    """Get all artifacts for a project, optionally filtered by phase.

    Args:
        project_id: UUID of the project
        phase: Filter by phase ("research" or "plan")
    """
    url = _api_url(f"/api/projects/{project_id}/artifacts")
    params = {}
    if phase:
        params["phase"] = phase
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
    artifacts = resp.json()
    if not artifacts:
        return "No artifacts found."
    lines = [f"# Artifacts ({len(artifacts)})\n"]
    for a in artifacts:
        lines.append(_format_artifact(a))
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
async def get_artifact_detail(project_id: str, artifact_id: str) -> str:
    """Get detailed content for a specific artifact.

    Args:
        project_id: UUID of the project
        artifact_id: Short artifact ID (e.g. art_7kx9)
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(_api_url(f"/api/projects/{project_id}/artifacts"))
        resp.raise_for_status()
    artifacts = resp.json()
    art = next((a for a in artifacts if a["id"] == artifact_id), None)
    if not art:
        return f"Artifact `{artifact_id}` not found in project `{project_id}`."

    lines = [f"# {art['title']} (`{art['id']}`)\n"]
    lines.append(f"**Type:** {art.get('type', 'unknown')}")
    lines.append(f"**Phase:** {art.get('phase', 'unknown')}")
    lines.append(f"**Importance:** {art.get('importance', 50)}/100")
    if art.get("source_url"):
        lines.append(f"**Source:** {art['source_url']}")
    lines.append("")
    if art.get("content"):
        lines.append(art["content"])
    return "\n".join(lines)


@mcp.tool()
async def get_plan_directions(project_id: str) -> str:
    """Get AI-suggested strategic plan directions based on research.

    Args:
        project_id: UUID of the project (must have research artifacts)
    """
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(_api_url(f"/api/projects/{project_id}/plan-directions"))
        resp.raise_for_status()
    data = resp.json()
    directions = data.get("directions", [])
    if not directions:
        return "No plan directions available."
    lines = ["# Plan Directions\n"]
    for i, d in enumerate(directions, 1):
        lines.append(f"## {i}. {d.get('title', 'Untitled')}\n")
        if d.get("description"):
            lines.append(d["description"])
        if d.get("key_focus"):
            lines.append(f"\n**Key focus:** {d['key_focus']}")
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
async def start_plan(
    project_id: str, description: str, ref_ids: list[str] | None = None
) -> str:
    """Generate a product/project plan. Waits for completion (up to 5 min).

    Args:
        project_id: UUID of the project
        description: What to build — used as the plan prompt
        ref_ids: Optional list of research artifact IDs to reference
    """
    ws_url = f"{WS_URL}/ws/projects/{project_id}"
    collected: list[dict] = []

    async with websockets.connect(ws_url) as ws:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                _api_url(f"/api/projects/{project_id}/plan"),
                json={
                    "description": description,
                    "reference_artifact_ids": ref_ids or [],
                },
            )
            resp.raise_for_status()

        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=300)
            except asyncio.TimeoutError:
                collected.append({"type": "timeout", "data": {"message": "Plan timed out"}})
                break
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = msg.get("type", "")
            collected.append(msg)

            if event_type == "plan_complete":
                break
            if event_type == "error":
                break

    artifacts = [
        m["data"].get("artifact", m.get("data", {}))
        for m in collected
        if m.get("type") == "plan_artifact_created"
    ]
    errors = [m for m in collected if m.get("type") == "error"]

    if errors:
        return f"Plan failed: {errors[0].get('data', {}).get('message', 'Unknown error')}"

    lines = ["# Plan Complete\n"]
    lines.append(f"**Components:** {len(artifacts)}\n")
    for a in artifacts:
        lines.append(_format_artifact(a))
        lines.append("")
    return "\n".join(lines)


@mcp.tool()
async def give_feedback(project_id: str, artifact_id: str, comment: str) -> str:
    """Give feedback on a specific artifact.

    Args:
        project_id: UUID of the project
        artifact_id: Short artifact ID (e.g. art_7kx9)
        comment: Your feedback comment
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _api_url(f"/api/projects/{project_id}/feedback"),
            json={
                "artifact_id": artifact_id,
                "comment": comment,
                "source": "human",
                "author": "Claude Code",
            },
        )
        resp.raise_for_status()
    return f"Feedback submitted for artifact `{artifact_id}`."


@mcp.tool()
async def export_plan(project_id: str, output_path: str | None = None) -> str:
    """Export a project as implementation-ready markdown and save to a file.

    Args:
        project_id: UUID of the project
        output_path: File path to write (defaults to PLAN.md in current directory)
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_api_url(f"/api/projects/{project_id}/export"))
        resp.raise_for_status()
    data = resp.json()
    markdown = data["markdown"]

    dest = Path(output_path) if output_path else Path.cwd() / "PLAN.md"
    dest.write_text(markdown, encoding="utf-8")

    # Build a preview: first 20 lines
    preview_lines = markdown.split("\n")[:20]
    preview = "\n".join(preview_lines)

    lines = [f"Plan exported to `{dest}`\n"]
    lines.append("**Preview:**\n")
    lines.append(f"```markdown\n{preview}\n```")
    if len(markdown.split("\n")) > 20:
        lines.append(f"\n_...{len(markdown.split(chr(10))) - 20} more lines_")
    return "\n".join(lines)


@mcp.tool()
async def open_in_browser(project_id: str) -> str:
    """Open a project in the MVP web UI.

    Args:
        project_id: UUID of the project
    """
    url = f"{FRONTEND_URL}?project={project_id}"
    webbrowser.open(url)
    return f"Opened project in browser: {url}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
