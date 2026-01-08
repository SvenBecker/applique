from collections.abc import Sequence

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.db.models import ExtractionStatus, JobPosting, LLMConfiguration


async def get_all_llm_configs(session: AsyncSession) -> Sequence[LLMConfiguration]:
    stmt = select(LLMConfiguration).order_by(LLMConfiguration.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


async def create_llm_config(
    session: AsyncSession,
    provider: str,
    model_name: str,
    api_key: str | None = None,
    base_url: str | None = None,
    is_active: bool = False,
) -> LLMConfiguration:
    # Check if we have any existing configs
    stmt = select(LLMConfiguration).limit(1)
    result = await session.execute(stmt)
    has_existing = result.scalars().first() is not None

    if not has_existing:
        # If this is the first config, force it to be active
        is_active = True

    if is_active:
        # If this one is set to active, deactivate all others
        await session.execute(update(LLMConfiguration).values(is_active=False))

    llm_config = LLMConfiguration(
        provider=provider,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
        is_active=is_active,
    )
    session.add(llm_config)
    await session.commit()
    await session.refresh(llm_config)
    return llm_config


async def delete_llm_config(session: AsyncSession, config_id: int) -> None:
    await session.execute(delete(LLMConfiguration).where(LLMConfiguration.id == config_id))
    await session.commit()


async def set_active_llm_config(session: AsyncSession, config_id: int) -> None:
    # Set all to inactive
    await session.execute(update(LLMConfiguration).values(is_active=False))
    # Set specific one to active
    await session.execute(update(LLMConfiguration).where(LLMConfiguration.id == config_id).values(is_active=True))
    await session.commit()


async def get_active_llm_config(session: AsyncSession) -> LLMConfiguration | None:
    stmt = select(LLMConfiguration).where(LLMConfiguration.is_active.is_(True))
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_all_postings(session: AsyncSession) -> Sequence[JobPosting]:
    stmt = select(JobPosting).order_by(JobPosting.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


async def create_posting(session: AsyncSession, url: str, description: str | None = None) -> JobPosting:
    posting = JobPosting(url=url, description=description)
    session.add(posting)
    await session.commit()
    await session.refresh(posting)
    return posting


async def update_posting_metadata(  # noqa: PLR0913
    session: AsyncSession,
    posting_id: int,
    *,
    metadata: dict | None = None,
    status: ExtractionStatus | None = None,
    full_content: str | None = None,
    error_message: str | None = None,
    status_updated: bool = False,
) -> JobPosting | None:
    # Build update values dynamically
    values = {"status_updated": status_updated}

    if metadata is not None:
        values["generated_metadata"] = metadata
    if status is not None:
        values["extraction_status"] = status
    if full_content is not None:
        values["full_content"] = full_content
    if error_message is not None:
        values["error_message"] = error_message

    stmt = update(JobPosting).where(JobPosting.id == posting_id).values(**values).returning(JobPosting)
    result = await session.execute(stmt)
    await session.commit()
    return result.scalars().first()


async def reset_posting_status_updated(session: AsyncSession, posting_id: int) -> None:
    await session.execute(update(JobPosting).where(JobPosting.id == posting_id).values(status_updated=False))
    await session.commit()


async def delete_posting(session: AsyncSession, posting_id: int) -> None:
    await session.execute(delete(JobPosting).where(JobPosting.id == posting_id))
    await session.commit()


async def get_posting_statistics(session: AsyncSession) -> dict:
    """Get job posting statistics for dashboard."""
    total = await session.execute(select(JobPosting))
    total_count = len(total.scalars().all())

    pending = await session.execute(
        select(JobPosting).where(
            JobPosting.extraction_status.in_([ExtractionStatus.PENDING, ExtractionStatus.PROCESSING])
        )
    )
    pending_count = len(pending.scalars().all())

    completed = await session.execute(
        select(JobPosting).where(JobPosting.extraction_status == ExtractionStatus.COMPLETED)
    )
    completed_count = len(completed.scalars().all())

    failed = await session.execute(select(JobPosting).where(JobPosting.extraction_status == ExtractionStatus.FAILED))
    failed_count = len(failed.scalars().all())

    return {
        "total_postings": total_count,
        "pending_postings": pending_count,
        "completed_postings": completed_count,
        "failed_postings": failed_count,
    }
