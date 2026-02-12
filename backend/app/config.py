from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    BRAVE_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    GEMINI_API_KEY: str = ""
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = {
        "env_file": ".env",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
