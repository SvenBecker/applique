"""API routes for job postings."""

import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.api.schemas import PostingCreateRequest, PostingResponse, PostingUpdateRequest
from applique_backend.db import crud
from applique_backend.db.models import ExtractionStatus, JobPosting
from applique_backend.services import extraction
from applique_backend.services.prompts.manager import PromptManager

router = APIRouter(prefix="/postings", tags=["postings"])
logger = logging.getLogger(__name__)


class URLValidationResult(BaseModel):
    """Result of URL validation check."""

    posting_id: int
    url: str
    is_valid: bool
    status_code: int | None = None
    error_message: str | None = None


class URLValidationResponse(BaseModel):
    """Response for bulk URL validation."""

    results: list[URLValidationResult]
    total_checked: int
    valid_count: int
    invalid_count: int


@router.get("", response_model=list[PostingResponse])
async def get_postings(db: Annotated[AsyncSession, Depends(get_db)]) -> list[PostingResponse]:
    """Get all job postings."""
    postings = await crud.get_all_postings(db)
    return [PostingResponse.model_validate(posting) for posting in postings]


@router.post("", response_model=PostingResponse, status_code=201)
async def create_posting(
    data: PostingCreateRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> PostingResponse:
    """Create a new job posting entry."""
    posting = await crud.create_posting(db, url=data.url, description=data.description)

    if data.trigger_extraction:
        background_tasks.add_task(run_extraction_task, posting.id, db, request.state.prompt_manager)

    return PostingResponse.model_validate(posting)


@router.post("/{posting_id}/extract", response_model=PostingResponse)
async def trigger_extraction(
    posting_id: int, background_tasks: BackgroundTasks, db: Annotated[AsyncSession, Depends(get_db)], request: Request
) -> PostingResponse:
    """Trigger AI extraction for a job posting."""
    stmt = select(JobPosting).where(JobPosting.id == posting_id)
    result = await db.execute(stmt)
    posting = result.scalars().first()

    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    background_tasks.add_task(run_extraction_task, posting_id, db, request.state.prompt_manager)
    return PostingResponse.model_validate(posting)


@router.delete("/{posting_id}", status_code=204)
async def delete_posting(posting_id: int, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    """Delete a job posting."""
    await crud.delete_posting(db, posting_id=posting_id)


@router.put("/{posting_id}", response_model=PostingResponse)
async def update_posting_metadata(
    posting_id: int,
    data: PostingUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PostingResponse:
    """Update job posting metadata."""
    # Separate full_content from metadata
    full_content = data.full_content
    metadata = data.model_dump(exclude={"full_content"})

    await crud.update_posting_metadata(
        db,
        posting_id=posting_id,
        metadata=metadata,
        full_content=full_content,
    )

    stmt = select(JobPosting).where(JobPosting.id == posting_id)
    result = await db.execute(stmt)
    posting = result.scalars().first()

    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    return PostingResponse.model_validate(posting)


@router.get("/{posting_id}", response_model=PostingResponse)
async def get_posting(posting_id: int, db: Annotated[AsyncSession, Depends(get_db)]) -> PostingResponse:
    """Get a specific job posting by ID."""
    stmt = select(JobPosting).where(JobPosting.id == posting_id)
    result = await db.execute(stmt)
    posting = result.scalars().first()

    if not posting:
        raise HTTPException(status_code=404, detail="Posting not found")

    return PostingResponse.model_validate(posting)


@router.post("/validate-urls", response_model=URLValidationResponse)
async def validate_posting_urls(db: Annotated[AsyncSession, Depends(get_db)]) -> URLValidationResponse:
    """Validate all job posting URLs to check if they still exist."""
    postings = await crud.get_all_postings(db)
    results: list[URLValidationResult] = []
    http_success_threshold = 400

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for posting in postings:
            try:
                response = await client.head(posting.url)
                is_valid = response.status_code < http_success_threshold
                results.append(
                    URLValidationResult(
                        posting_id=posting.id,
                        url=posting.url,
                        is_valid=is_valid,
                        status_code=response.status_code,
                    )
                )
            except Exception as e:
                logger.warning("Failed to validate URL %s: %s", posting.url, str(e))
                results.append(
                    URLValidationResult(
                        posting_id=posting.id,
                        url=posting.url,
                        is_valid=False,
                        error_message=str(e),
                    )
                )

    valid_count = sum(1 for r in results if r.is_valid)
    invalid_count = len(results) - valid_count

    return URLValidationResponse(
        results=results,
        total_checked=len(results),
        valid_count=valid_count,
        invalid_count=invalid_count,
    )


async def run_extraction_task(
    posting_id: int,
    db: AsyncSession,
    prompt_manager: PromptManager,
) -> None:
    """Background task to run AI extraction."""
    await crud.update_posting_metadata(db, posting_id, status=ExtractionStatus.PROCESSING, error_message="")

    llm_config = await crud.get_active_llm_config(db)
    if not llm_config:
        await crud.update_posting_metadata(
            db,
            posting_id,
            status=ExtractionStatus.FAILED,
            error_message="No active LLM configuration found. Please configure an LLM provider first.",
        )
        return

    stmt = select(JobPosting).where(JobPosting.id == posting_id)
    result = await db.execute(stmt)
    posting = result.scalars().first()

    if not posting:
        return

    try:
        metadata_obj = await extraction.extract_metadata(posting.url, llm_config, prompt_manager)
        await crud.update_posting_metadata(
            db,
            posting_id,
            metadata=metadata_obj.model_dump(exclude={"full_content"}),
            status=ExtractionStatus.COMPLETED,
            full_content=metadata_obj.full_content,
            error_message="",
            status_updated=True,
        )
    except Exception as e:
        logger.exception("Extraction failed for posting %s", posting_id)
        error_msg = str(e)
        if len(error_msg) > 500:  # noqa: PLR2004
            error_msg = error_msg[:497] + "..."
        await crud.update_posting_metadata(
            db,
            posting_id,
            status=ExtractionStatus.FAILED,
            error_message=error_msg,
            status_updated=True,
        )
