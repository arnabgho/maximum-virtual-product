import logging
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

logger = logging.getLogger(__name__)


class SupabaseDB:
    def __init__(self):
        settings = get_settings()
        self._client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        # Service-role client for storage operations (bypasses RLS)
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            self._storage_client: Client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
            )
        else:
            self._storage_client = self._client
        logger.info("Supabase DB client initialized")

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

    async def list_projects(self) -> list[Project]:
        result = self._client.table("projects").select("*").order("updated_at", desc=True).execute()
        return [Project(**row) for row in result.data]

    async def delete_project(self, project_id: str) -> bool:
        result = self._client.table("projects").delete().eq("id", project_id).execute()
        return len(result.data) > 0

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
        logger.debug("save_artifacts: %d artifacts", len(artifacts))
        data = []
        for a in artifacts:
            d = a.model_dump()
            d["created_at"] = d["created_at"].isoformat()
            data.append(d)
        result = self._client.table("artifacts").insert(data).execute()
        return [Artifact(**row) for row in result.data]

    async def update_artifact_image(self, artifact_id: str, image_url: str) -> bool:
        try:
            self._client.table("artifacts").update(
                {"image_url": image_url}
            ).eq("id", artifact_id).execute()
            return True
        except Exception:
            logger.error("Failed to update image for artifact=%s", artifact_id, exc_info=True)
            return False

    # ── Connection methods ───────────────────────────────────────────

    async def create_connection(self, conn: ArtifactConnection) -> ArtifactConnection:
        result = self._client.table("artifact_connections").insert(conn.model_dump()).execute()
        return ArtifactConnection(**result.data[0])

    async def save_connections(
        self, connections: list[ArtifactConnection]
    ) -> list[ArtifactConnection]:
        if not connections:
            return []
        logger.debug("save_connections: %d connections", len(connections))
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
        logger.debug("save_groups: %d groups", len(groups))
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

    async def mark_feedback_addressed(self, artifact_id: str) -> None:
        self._client.table("feedback").update(
            {"status": "addressed"}
        ).eq("artifact_id", artifact_id).eq("status", "pending").execute()

    # ── Storage methods ───────────────────────────────────────────

    def ensure_video_bucket(self) -> None:
        """Create the 'videos' storage bucket if it doesn't exist."""
        try:
            self._storage_client.storage.create_bucket(
                "videos",
                options={"public": True, "allowed_mime_types": ["video/mp4"]},
            )
            logger.info("Created 'videos' storage bucket")
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg or "duplicate" in msg:
                logger.debug("Videos bucket already exists")
            else:
                raise

    def ensure_images_bucket(self) -> None:
        """Create the 'images' storage bucket if it doesn't exist."""
        try:
            self._storage_client.storage.create_bucket(
                "images",
                options={
                    "public": True,
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
                },
            )
            logger.info("Created 'images' storage bucket")
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg or "duplicate" in msg:
                logger.debug("Images bucket already exists")
            else:
                raise

    def upload_image(self, image_bytes: bytes, destination: str, content_type: str = "image/jpeg") -> str:
        """Upload image bytes to the 'images' bucket, return its public URL."""
        self.ensure_images_bucket()
        bucket = self._storage_client.storage.from_("images")
        bucket.upload(
            path=destination,
            file=image_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return bucket.get_public_url(destination)

    def upload_video(self, file_path: str, destination: str) -> str:
        """Upload an MP4 to the 'videos' bucket, return its public URL."""
        bucket = self._storage_client.storage.from_("videos")
        bucket.upload(
            path=destination,
            file=file_path,
            file_options={"content-type": "video/mp4", "upsert": "true"},
        )
        return bucket.get_public_url(destination)


_db: SupabaseDB | None = None


def get_db() -> SupabaseDB:
    global _db
    if _db is None:
        _db = SupabaseDB()
    return _db
