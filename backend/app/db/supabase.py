from datetime import datetime

from supabase import Client, create_client

from app.config import get_settings
from app.models.schema import (
    Artifact,
    ArtifactConnection,
    Feedback,
    Group,
    Project,
)


class SupabaseDB:
    def __init__(self):
        settings = get_settings()
        self._client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

    # ── Project methods ──────────────────────────────────────────────

    async def create_project(self, project: Project) -> Project:
        data = project.model_dump()
        data["created_at"] = data["created_at"].isoformat()
        data["updated_at"] = data["updated_at"].isoformat()
        result = self._client.table("projects").insert(data).execute()
        return Project(**result.data[0])

    async def get_project(self, project_id: str) -> Project | None:
        result = self._client.table("projects").select("*").eq("id", project_id).execute()
        if result.data:
            return Project(**result.data[0])
        return None

    async def update_project(self, project_id: str, updates: dict) -> Project | None:
        updates["updated_at"] = datetime.utcnow().isoformat()
        result = self._client.table("projects").update(updates).eq("id", project_id).execute()
        if result.data:
            return Project(**result.data[0])
        return None

    # ── Artifact methods ─────────────────────────────────────────────

    async def create_artifact(self, artifact: Artifact) -> Artifact:
        data = artifact.model_dump()
        data["created_at"] = data["created_at"].isoformat()
        result = self._client.table("artifacts").insert(data).execute()
        return Artifact(**result.data[0])

    async def get_artifacts(self, project_id: str, phase: str | None = None) -> list[Artifact]:
        query = self._client.table("artifacts").select("*").eq("project_id", project_id)
        if phase:
            query = query.eq("phase", phase)
        result = query.execute()
        return [Artifact(**row) for row in result.data]

    async def update_artifact(self, artifact_id: str, updates: dict) -> Artifact | None:
        result = self._client.table("artifacts").update(updates).eq("id", artifact_id).execute()
        if result.data:
            return Artifact(**result.data[0])
        return None

    async def save_artifacts(self, artifacts: list[Artifact]) -> list[Artifact]:
        if not artifacts:
            return []
        data = []
        for a in artifacts:
            d = a.model_dump()
            d["created_at"] = d["created_at"].isoformat()
            data.append(d)
        result = self._client.table("artifacts").insert(data).execute()
        return [Artifact(**row) for row in result.data]

    # ── Connection methods ───────────────────────────────────────────

    async def create_connection(self, conn: ArtifactConnection) -> ArtifactConnection:
        result = self._client.table("artifact_connections").insert(conn.model_dump()).execute()
        return ArtifactConnection(**result.data[0])

    async def save_connections(
        self, connections: list[ArtifactConnection]
    ) -> list[ArtifactConnection]:
        if not connections:
            return []
        data = [c.model_dump() for c in connections]
        result = self._client.table("artifact_connections").insert(data).execute()
        return [ArtifactConnection(**row) for row in result.data]

    async def get_connections(self, project_id: str) -> list[ArtifactConnection]:
        result = (
            self._client.table("artifact_connections")
            .select("*")
            .eq("project_id", project_id)
            .execute()
        )
        return [ArtifactConnection(**row) for row in result.data]

    # ── Group methods ────────────────────────────────────────────────

    async def create_group(self, group: Group) -> Group:
        result = self._client.table("groups").insert(group.model_dump()).execute()
        return Group(**result.data[0])

    async def save_groups(self, groups: list[Group]) -> list[Group]:
        if not groups:
            return []
        data = [g.model_dump() for g in groups]
        result = self._client.table("groups").insert(data).execute()
        return [Group(**row) for row in result.data]

    async def get_groups(self, project_id: str, phase: str | None = None) -> list[Group]:
        query = self._client.table("groups").select("*").eq("project_id", project_id)
        if phase:
            query = query.eq("phase", phase)
        result = query.execute()
        return [Group(**row) for row in result.data]

    # ── Feedback methods ─────────────────────────────────────────────

    async def create_feedback(self, feedback: Feedback) -> Feedback:
        data = feedback.model_dump()
        data["created_at"] = data["created_at"].isoformat()
        result = self._client.table("feedback").insert(data).execute()
        return Feedback(**result.data[0])

    async def get_feedback(
        self, project_id: str, artifact_id: str | None = None
    ) -> list[Feedback]:
        query = self._client.table("feedback").select("*").eq("project_id", project_id)
        if artifact_id:
            query = query.eq("artifact_id", artifact_id)
        result = query.order("created_at").execute()
        return [Feedback(**row) for row in result.data]


_db: SupabaseDB | None = None


def get_db() -> SupabaseDB:
    global _db
    if _db is None:
        _db = SupabaseDB()
    return _db
