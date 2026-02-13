"""Export service: builds a structured markdown document from a project."""

import logging

from app.db.supabase import get_db
from app.services.dag_utils import topological_sort_layers

logger = logging.getLogger(__name__)


async def export_project_markdown(project_id: str) -> str:
    """Build implementation-ready markdown for a project.

    Sections: overview, research findings, architecture, plan components,
    implementation checklist, dependency graph, pending feedback.
    """
    db = get_db()

    project = await db.get_project(project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")

    research_artifacts = await db.get_artifacts(project_id, phase="research")
    plan_artifacts = await db.get_artifacts(project_id, phase="plan")
    connections = await db.get_connections(project_id)
    groups = await db.get_groups(project_id)
    feedback = await db.get_feedback(project_id)

    sections: list[str] = []

    # --- Project overview ---
    sections.append(f"# {project.title}\n")
    if project.description:
        sections.append(f"{project.description}\n")
    sections.append(f"**Project ID:** `{project.id}`  ")
    sections.append(f"**Phase:** {project.phase}\n")

    # --- Research findings ---
    if research_artifacts:
        sections.append("## Research Findings\n")

        # Group artifacts by group
        group_map = {g.id: g for g in groups if g.phase == "research"}
        grouped: dict[str | None, list] = {}
        for art in research_artifacts:
            grouped.setdefault(art.group_id, []).append(art)

        for group_id, arts in grouped.items():
            if group_id and group_id in group_map:
                sections.append(f"### {group_map[group_id].title}\n")
            elif group_id is None and len(grouped) > 1:
                sections.append("### Ungrouped\n")

            for art in arts:
                sections.append(f"#### {art.title} (`{art.id}`)\n")
                if art.summary:
                    sections.append(f"{art.summary}\n")
                if art.source_url:
                    sections.append(f"Source: {art.source_url}\n")
                if art.image_url:
                    sections.append(f"![{art.title}]({art.image_url})\n")

    # --- Architecture (mermaid diagrams) ---
    mermaid_artifacts = [a for a in plan_artifacts if a.type == "mermaid"]
    if mermaid_artifacts:
        sections.append("## Architecture\n")
        for art in mermaid_artifacts:
            sections.append(f"### {art.title}\n")
            sections.append(f"```mermaid\n{art.content}\n```\n")
            if art.image_url:
                sections.append(f"![{art.title}]({art.image_url})\n")

    # --- Plan components ---
    non_mermaid_plan = [a for a in plan_artifacts if a.type != "mermaid"]
    if non_mermaid_plan:
        sections.append("## Plan Components\n")

        conn_dicts = [
            {"from_id": c.from_artifact_id, "to_id": c.to_artifact_id}
            for c in connections
        ]
        plan_ids = [a.id for a in non_mermaid_plan]
        layers = topological_sort_layers(plan_ids, conn_dicts)
        id_to_art = {a.id: a for a in non_mermaid_plan}

        layer_num = 0
        for layer in layers:
            layer_num += 1
            sections.append(f"### Layer {layer_num}\n")
            for aid in layer:
                art = id_to_art.get(aid)
                if not art:
                    continue
                sections.append(f"#### {art.title} (`{art.id}`)\n")
                sections.append(f"**Type:** {art.type}  ")
                sections.append(f"**Importance:** {art.importance}/100\n")
                if art.content:
                    sections.append(f"{art.content}\n")
                if art.image_url:
                    sections.append(f"![{art.title}]({art.image_url})\n")

        # --- Implementation checklist ---
        sections.append("## Implementation Checklist\n")
        for layer in layers:
            for aid in layer:
                art = id_to_art.get(aid)
                if art:
                    sections.append(f"- [ ] {art.title} (`{art.id}`)")
        sections.append("")

    # --- Dependency graph ---
    if connections:
        sections.append("## Dependency Graph\n")
        for c in connections:
            sections.append(
                f"- `{c.from_artifact_id}` --[{c.label or c.connection_type}]--> `{c.to_artifact_id}`"
            )
        sections.append("")

    # --- Pending feedback ---
    pending = [f for f in feedback if f.status == "pending"]
    if pending:
        sections.append("## Pending Feedback\n")
        for fb in pending:
            sections.append(f"- **{fb.artifact_id}** ({fb.source}): {fb.comment}")
        sections.append("")

    return "\n".join(sections)
