"""Configuration helpers for Forge v2."""

from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel, Field

class Settings(BaseModel):
    forgefile: Path = Field(default=Path("Forgefile.yaml"), description="Path to the Forge ritual definition file.")

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
