"""Base class for research sub-agents."""

from abc import ABC, abstractmethod


class BaseAgent(ABC):
    def __init__(self, agent_id: str, project_id: str):
        self.agent_id = agent_id
        self.project_id = project_id

    @abstractmethod
    async def execute(self) -> list[dict]:
        """Execute the agent's task and return a list of artifact dicts."""
        ...
