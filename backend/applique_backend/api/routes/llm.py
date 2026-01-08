"""API routes for LLM configuration."""

import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic_ai import Agent
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.api.schemas import (
    LLMConfigCreateRequest,
    LLMConfigResponse,
    LLMFetchModelsRequest,
    LLMFetchModelsResponse,
    LLMTestConnectionRequest,
    LLMTestConnectionResponse,
)
from applique_backend.db import crud
from applique_backend.services.llm import get_model

router = APIRouter(prefix="/llm", tags=["llm"])
logger = logging.getLogger(__name__)


@router.get("/configs", response_model=list[LLMConfigResponse])
async def get_llm_configs(db: Annotated[AsyncSession, Depends(get_db)]) -> list[LLMConfigResponse]:
    """Get all LLM configurations."""
    configs = await crud.get_all_llm_configs(db)
    return [LLMConfigResponse.model_validate(config) for config in configs]


@router.post("/configs", response_model=LLMConfigResponse, status_code=201)
async def create_llm_config(
    data: LLMConfigCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LLMConfigResponse:
    """Create a new LLM configuration."""
    config = await crud.create_llm_config(
        db,
        provider=data.provider,
        model_name=data.model_name,
        api_key=data.api_key,
        base_url=data.base_url,
        is_active=data.is_active,
    )
    return LLMConfigResponse.model_validate(config)


@router.post("/configs/{config_id}/activate")
async def activate_llm_config(config_id: int, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    """Activate an LLM configuration."""
    await crud.set_active_llm_config(db, config_id=config_id)


@router.post("/configs/{config_id}/test", response_model=LLMTestConnectionResponse)
async def test_existing_llm_config(
    config_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LLMTestConnectionResponse:
    """Test connection for an existing LLM configuration."""
    # Get the config from database
    configs = await crud.get_all_llm_configs(db)
    config = next((c for c in configs if c.id == config_id), None)

    if not config:
        raise HTTPException(status_code=404, detail="LLM configuration not found")

    try:
        model = get_model(
            provider=config.provider,
            model_name=config.model_name,
            base_url=config.base_url,
            api_key=config.api_key,
        )
        agent = Agent(model)
        result = await agent.run("Respond with 'Connection successful' if you can read this.")
        return LLMTestConnectionResponse(status="success", message=result.output)
    except Exception as e:
        logger.error("Failed to test LLM config %s: %s", config_id, e)
        return LLMTestConnectionResponse(status="error", message=str(e))


@router.delete("/configs/{config_id}", status_code=204)
async def delete_llm_config(config_id: int, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    """Delete an LLM configuration."""
    await crud.delete_llm_config(db, config_id=config_id)


@router.post("/test-connection", response_model=LLMTestConnectionResponse)
async def test_llm_connection(data: LLMTestConnectionRequest) -> LLMTestConnectionResponse:
    """Test connection to an LLM provider."""
    try:
        model = get_model(
            provider=data.provider,
            model_name=data.model_name,
            base_url=data.base_url,
            api_key=data.api_key,
        )
        agent = Agent(model)
        result = await agent.run("Respond with 'Connection successful' if you can read this.")
        return LLMTestConnectionResponse(status="success", message=result.output)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/fetch-models", response_model=LLMFetchModelsResponse)
async def fetch_models(data: LLMFetchModelsRequest) -> LLMFetchModelsResponse:
    """Fetch available models from an LLM provider."""
    target_url = data.base_url.rstrip("/")
    if not target_url.endswith("/models"):
        target_url = f"{target_url}/models"

    headers = {}
    if data.api_key:
        headers["Authorization"] = f"Bearer {data.api_key}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(target_url, headers=headers)
            response.raise_for_status()
            response_data = response.json()
            models = sorted(m["id"] for m in response_data.get("data", []))
            return LLMFetchModelsResponse(models=models)
    except Exception as e:
        logger.error("Failed to fetch models from %s: %s", target_url, e)
        raise HTTPException(status_code=400, detail=str(e)) from e
