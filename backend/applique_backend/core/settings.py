from enum import StrEnum
from pathlib import Path
from typing import Self

from pydantic import PrivateAttr, model_validator
from pydantic_settings import BaseSettings

APP_DIR = Path(__file__).parents[1]
BACKEND_ROOT_DIR = APP_DIR.parent
PROJECT_ROOT_DIR = BACKEND_ROOT_DIR.parent


class OTELExporter(StrEnum):
    NONE = "none"
    CONSOLE = "console"
    OTLP = "otlp"


class Settings(BaseSettings):
    VERSION: str = "0.1.0"
    """Version of the application."""

    API_TITLE: str = "API Documentation"
    """Title of the swagger documentation."""

    API_DESCRIPTION: str = "API Documentation"
    """A short description of the project, displayed within the Swagger documentation."""

    API_V1_PATH: str = "/v1"
    """Prefix for the v1 endpoints."""

    API_ROOT_PATH: str = ""
    """A root path (useful if application is running behind some proxy)."""

    API_SWAGGER_URL: str | None = "/docs"
    """Url to the swagger documentation."""

    API_REDOC_URL: str | None = None
    """Url to the redoc documentation."""

    API_OPENAPI_URL: str = "/openapi.json"
    """OpenAPI json url."""

    API_SWAGGER_UI_OAUTH2_REDIRECT_URL: str | None = "/docs/oauth2-redirect"
    """OAuth2 redirect url."""

    API_HEALTHCHECK_URL: str | None = "/healthz"
    """Url of the health/liveness endpoint."""

    API_READYCHECK_URL: str | None = "/readyz"
    """Url of the readiness endpoint."""

    # Updated defaults to use 'data' directory for better Docker/SQLite compatibility
    DATABASE_DSN: str = f"sqlite+aiosqlite:///{PROJECT_ROOT_DIR / 'data' / 'db.sqlite3'}"
    """Database connection string."""

    OUTPUT_DIR: Path = PROJECT_ROOT_DIR / "output"
    """Output directory."""

    DATA_DIR: Path = PROJECT_ROOT_DIR / "data"
    """Input directory."""

    USER_PROMPTS_DIR: Path = PROJECT_ROOT_DIR / "data" / "prompts"
    """User-customizable prompt templates directory."""

    ENABLE_PROMPT_HOT_RELOAD: bool = False
    """Enable hot reloading of prompt templates without restart."""

    RUNNING_IN_DOCKER: bool = False
    """Whether the application is running inside a Docker container."""

    # OpenTelemetry
    _OTEL_ENABLED: bool = PrivateAttr(default=False)
    OTEL_SERVICE_NAME: str = "applique"
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None
    OTEL_TRACES_EXPORTER: OTELExporter | None = None
    OTEL_METRICS_EXPORTER: OTELExporter | None = None
    OTEL_LOGS_EXPORTER: OTELExporter | None = None

    @property
    def otel_enabled(self) -> bool:
        return self._OTEL_ENABLED

    @model_validator(mode="after")
    def _post_setup(self) -> Self:
        if not self._OTEL_ENABLED:
            for value in (self.OTEL_METRICS_EXPORTER, self.OTEL_LOGS_EXPORTER, self.OTEL_TRACES_EXPORTER):
                match value:
                    case OTELExporter.OTLP | OTELExporter.CONSOLE:
                        self._OTEL_ENABLED = True
                        break
                    case _:
                        continue
        return self
