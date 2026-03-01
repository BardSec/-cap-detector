from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    secret_key: str = "dev-secret-change-me"
    database_url: str = "postgresql://pcapbloodhound:changeme@localhost:5432/pcapbloodhound"
    redis_url: str = "redis://localhost:6379/0"

    # Microsoft OAuth
    microsoft_client_id: Optional[str] = None
    microsoft_client_secret: Optional[str] = None
    microsoft_tenant_id: str = "common"

    # Google OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None

    # Access control
    frontend_url: str = "http://localhost"
    # Comma-separated list of allowed email domains; empty = allow all
    allowed_domains: str = ""

    # Upload limits
    max_upload_mb: int = 200

    @property
    def allowed_domain_list(self) -> list[str]:
        if not self.allowed_domains:
            return []
        return [d.strip().lower() for d in self.allowed_domains.split(",") if d.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


settings = Settings()
