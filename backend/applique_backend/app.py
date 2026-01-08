import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from enum import StrEnum
from typing import Any, Literal, TypedDict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
)

from applique_backend.api.router import api_router
from applique_backend.core.exceptions import register_exception_handlers
from applique_backend.core.settings import APP_DIR, Settings
from applique_backend.core.telemetry import UvicornAccessLoggingFilter, setup_telemetry
from applique_backend.db.core import setup_db
from applique_backend.services.prompts.manager import PromptManager

logger = logging.getLogger(__name__)


class ReadyStatus(StrEnum):
    """Ready status enum."""

    READY = "ready"
    NOT_READY = "not ready"


class ApplicationState(TypedDict):
    """Objects stored on the application state."""

    settings: Settings
    ready_status: ReadyStatus
    session_maker: async_sessionmaker[AsyncSession]
    prompt_manager: PromptManager


class HealthCheckResponse(BaseModel):
    """Healthcheck response schema."""

    status: Literal["ok"] = "ok"


class ReadyCheckResponse(BaseModel):
    """Readiness response schema."""

    status: ReadyStatus


def build_app(settings: Settings | None = None) -> FastAPI:
    """Factory function for creating a fastapi application.

    Args:
        settings: Manually providing settings is only meant for testing purposes. This function will be called
        by uvicorn, thus settings will never be provided.
    Returns:
        A FastAPI object with routes, middleware etc. already added.
    """
    settings_: Settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[ApplicationState]:
        engine, session_maker = await setup_db(settings_)
        if settings_.otel_enabled:
            SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
        ready_status = ReadyStatus.READY
        yield ApplicationState(
            settings=settings_,
            session_maker=session_maker,
            ready_status=ready_status,
            prompt_manager=PromptManager(
                user_prompts_dir=settings_.USER_PROMPTS_DIR,
                enable_hot_reload=settings_.ENABLE_PROMPT_HOT_RELOAD,
            ),
        )
        await engine.dispose()

    app = FastAPI(
        title=settings_.API_TITLE,
        description=settings_.API_DESCRIPTION,
        root_path=settings_.API_ROOT_PATH,
        version=settings_.VERSION,
        docs_url=settings_.API_SWAGGER_URL,
        redoc_url=settings_.API_REDOC_URL,
        openapi_url=settings_.API_OPENAPI_URL,
        swagger_ui_oauth2_redirect_url=settings_.API_SWAGGER_UI_OAUTH2_REDIRECT_URL,
        lifespan=lifespan,
    )

    # Add CORS middleware for React frontend
    app.add_middleware(
        CORSMiddleware,  # type: ignore[arg-type]
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    register_exception_handlers(app)
    excluded_endpoints = ["/static/", "/metrics", "/api/postings", "/api/status"]

    if settings_.API_HEALTHCHECK_URL:
        excluded_endpoints.append(settings_.API_HEALTHCHECK_URL)

        @app.get(settings_.API_HEALTHCHECK_URL, tags=["health"])
        async def healthcheck() -> HealthCheckResponse:
            """Check heath of the application."""
            return HealthCheckResponse()

    if settings_.API_READYCHECK_URL:
        excluded_endpoints.append(settings_.API_READYCHECK_URL)

        @app.get(settings_.API_READYCHECK_URL, tags=["health"])
        async def readycheck(request: Request) -> ReadyCheckResponse:
            """Check readiness of the application."""
            try:
                return ReadyCheckResponse(status=request.state.ready_status)
            except:  # noqa: E722
                return ReadyCheckResponse(status=ReadyStatus.NOT_READY)

    setup_telemetry(settings=settings_, app=app)
    logging.getLogger("uvicorn.access").addFilter(UvicornAccessLoggingFilter(excluded_endpoints))
    return app


if __name__ == "__main__":
    # this is intended for debugging purposes only
    import argparse
    from pathlib import Path

    import uvicorn
    import yaml

    parser = argparse.ArgumentParser(description="Run the Applique FastAPI application via uvicorn.")
    parser.add_argument("--host", default="localhost", help="Host address to bind.")
    parser.add_argument("--port", type=int, default=8000, help="Port number to bind.")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development.")
    parser.add_argument("--log-config", type=Path, default=None, help="Path to a YAML logging config file.")
    args = parser.parse_args()

    if args.log_config and (log_config_fp := Path(args.log_config)).exists():
        log_config: dict[str, Any] | None = yaml.safe_load(log_config_fp.read_text(encoding="utf-8"))
    else:
        log_config = None

    uvicorn.run(
        "applique_backend.app:build_app",
        factory=True,
        host=args.host,
        port=args.port,
        log_config=log_config,
        reload=args.reload,
        reload_dirs=[str(APP_DIR)] if args.reload else None,
    )
