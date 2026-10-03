"""All runtime configuration, read from the repo-root `.env`."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

# Store agents that run as their own processes. `kind` picks the backend.
STORES: dict[str, dict] = {
    "nogoon": {"name": "Ногоон маркет", "port": 8101, "kind": "mock"},
    "altan": {"name": "Алтан сагс", "port": 8102, "kind": "mock"},
    "khuns": {"name": "Хүнс 24", "port": 8103, "kind": "mock"},
    "emart": {"name": "Emart (live web)", "port": 8104, "kind": "emart"},
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "sags"

    # Language layer. OyuLLM (OpenAI-compatible) wins if configured, then Claude, then rules.
    anthropic_api_key: str = ""
    llm_model: str = "claude-opus-5"
    oyullm_base_url: str = ""
    oyullm_api_key: str = ""
    oyullm_model: str = "oyullm"

    # Decision layer (Jev by TypeSafe AI).
    typesafe_api_key: str = ""
    jev_model: str = "jev-latest"
    jev_min_confidence: float = 0.6  # intent decisions below this fall back to defaults
    jev_match_threshold: float = 0.5  # web result accepted if P(some result is the product) >= this

    host: str = "127.0.0.1"
    shopper_port: int = 8000
    memory_mcp_port: int = 8100
    frontend_origin: str = "http://localhost:3000"

    demo_user_id: str = "demo"

    @property
    def memory_mcp_url(self) -> str:
        return f"http://{self.host}:{self.memory_mcp_port}/mcp"

    def store_url(self, store_id: str) -> str:
        return f"http://{self.host}:{STORES[store_id]['port']}"


@lru_cache
def settings() -> Settings:
    return Settings()
