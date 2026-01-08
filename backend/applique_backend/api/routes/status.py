"""API routes for status and home page data."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.api.schemas import LLMConfigResponse, StatusResponse
from applique_backend.db import crud

router = APIRouter(prefix="", tags=["status"])
logger = logging.getLogger(__name__)


@router.get("/status", response_model=StatusResponse)
async def get_status(db: Annotated[AsyncSession, Depends(get_db)]) -> StatusResponse:
    """Get dashboard status including active LLM and job posting statistics."""
    active_llm = await crud.get_active_llm_config(db)
    stats = await crud.get_posting_statistics(db)

    return StatusResponse(
        active_llm=LLMConfigResponse.model_validate(active_llm) if active_llm else None,
        **stats,
    )
