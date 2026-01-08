"""Common dependencies for API routes."""

from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db(request: Request) -> AsyncGenerator[AsyncSession]:
    """Dependency that yields a database session."""
    async_session_maker = request.state.session_maker
    async with async_session_maker() as session:
        yield session
