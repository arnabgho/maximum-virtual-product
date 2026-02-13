"""Claude-powered research sub-agent that uses built-in web search."""

import logging
import uuid

from app.agents.base import BaseAgent
from app.services import claude_service
from app.ws.manager import WSManager
from app.models.schema import Artifact, generate_artifact_id

logger = logging.getLogger(__name__)


class ResearchAgent(BaseAgent):
    def __init__(
        self,
        angle: dict,
        project_id: str,
        ws_manager: WSManager,
    ):
        agent_id = f"agent_{uuid.uuid4().hex[:8]}"
        super().__init__(agent_id, project_id)
        self.angle = angle
        self.ws = ws_manager
        self.sub_query = angle.get("sub_query", "")
        self.focus = angle.get("focus", "")
        self.angle_name = angle.get("angle", "Research")

    async def execute(self) -> list[Artifact]:
        """Execute research using Claude's built-in web search tool.

        Single API call: Claude searches the web, reads results, and
        synthesizes findings — no external search API needed.
        """
        # Notify: agent started
        await self.ws.send_event(self.project_id, "agent_started", {
            "agent_id": self.agent_id,
            "focus_area": self.angle_name,
            "sub_query": self.sub_query,
        })

        logger.info("Agent %s started: angle=%r sub_query=%r", self.agent_id, self.angle_name, self.sub_query)

        try:
            # Step 1: Claude searches + analyzes in one call
            await self.ws.send_event(self.project_id, "agent_thinking", {
                "agent_id": self.agent_id,
                "text": f"Searching & analyzing: {self.sub_query}",
            })

            findings = await claude_service.research_angle_with_search(
                self.sub_query, self.angle_name, self.focus
            )

            # Step 2: Create artifact objects
            artifacts = []
            for finding in findings:
                artifact = Artifact(
                    id=generate_artifact_id(),
                    project_id=self.project_id,
                    phase="research",
                    type=finding.get("type", "research_finding"),
                    title=finding.get("title", "Finding"),
                    content=finding.get("content", ""),
                    summary=finding.get("summary", ""),
                    source_url=finding.get("source_url"),
                    importance=finding.get("importance", 50),
                    metadata={"angle": self.angle_name, "agent_id": self.agent_id},
                )
                artifacts.append(artifact)

                # Stream each artifact to the frontend
                await self.ws.send_event(self.project_id, "artifact_created", {
                    "artifact": artifact.model_dump(),
                })

            # Notify: agent complete
            await self.ws.send_event(self.project_id, "agent_complete", {
                "agent_id": self.agent_id,
                "artifact_count": len(artifacts),
            })

            logger.info("Agent %s complete: %d findings", self.agent_id, len(artifacts))
            return artifacts

        except Exception as e:
            logger.error("Agent %s failed: %s", self.agent_id, e)
            await self.ws.send_event(self.project_id, "error", {
                "message": f"Agent {self.angle_name} failed: {str(e)}",
                "agent_id": self.agent_id,
            })
            return []
