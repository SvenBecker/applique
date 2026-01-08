"""API routes for user profile management."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.api.schemas import UserProfileResponse, UserProfileUpdateRequest
from applique_backend.db.models import UserProfile

router = APIRouter(prefix="/profile", tags=["profile"])
logger = logging.getLogger(__name__)


@router.get("", response_model=UserProfileResponse)
async def get_profile(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserProfileResponse:
    """Get user profile. Creates default profile if none exists."""
    # For single-user app, we'll just get/create the first profile
    stmt = select(UserProfile).limit(1)
    result = await db.execute(stmt)
    profile = result.scalars().first()

    if not profile:
        # Create default profile
        profile = UserProfile()
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        logger.info("Created default user profile")

    return UserProfileResponse.model_validate(profile)


@router.put("", response_model=UserProfileResponse)
async def update_profile(
    request: Request,
    data: UserProfileUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserProfileResponse:
    """Update user profile."""
    # Get or create profile
    stmt = select(UserProfile).limit(1)
    result = await db.execute(stmt)
    profile = result.scalars().first()

    if not profile:
        profile = UserProfile()
        db.add(profile)

    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    logger.info("Updated user profile")
    return UserProfileResponse.model_validate(profile)
